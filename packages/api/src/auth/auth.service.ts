import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * Authentication Service
 *
 * Handles user registration, login, JWT token generation.
 * Implements secure password hashing with bcrypt (10 rounds).
 *
 * Security features:
 * - Password hashing with bcrypt
 * - JWT access tokens (7-day expiry)
 * - Refresh tokens (30-day expiry)
 * - Token rotation on refresh
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  /**
   * Register a new user.
   *
   * @param registerDto - User registration data
   * @returns User object with access and refresh tokens
   * @throws ConflictException if email already exists
   */
  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, organizationId } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = this.usersRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
      organizationId,
      role: 'FARMER', // Default role
    });

    const savedUser = await this.usersRepository.save(user);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(savedUser);

    return {
      user: this.sanitizeUser(savedUser),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user with email and password.
   *
   * @param loginDto - Login credentials
   * @returns User object with access and refresh tokens
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token.
   *
   * @param refreshToken - Valid refresh token
   * @returns New access and refresh tokens
   * @throws UnauthorizedException if refresh token is invalid
   */
  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Find user
      const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens (token rotation)
      const tokens = await this.generateTokens(user);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate user from JWT payload.
   * Used by JWT strategy.
   *
   * @param payload - JWT payload
   * @returns User object without password
   */
  async validateUser(payload: any): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: ['organization'],
    });

    if (!user) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  /**
   * Generate access and refresh tokens for user.
   *
   * @param user - User entity
   * @returns Object with accessToken and refreshToken
   */
  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRATION || '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
    });

    return { accessToken, refreshToken };
  }

  /**
   * Hash password with bcrypt (10 rounds).
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash.
   *
   * @param password - Plain text password
   * @param hash - Bcrypt hash
   * @returns True if password matches
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Remove sensitive fields from user object.
   *
   * @param user - User entity
   * @returns Sanitized user object
   */
  private sanitizeUser(user: User) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
