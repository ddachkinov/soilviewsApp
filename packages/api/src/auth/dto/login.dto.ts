import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for user login.
 */
export class LoginDto {
  @ApiProperty({ example: 'farmer@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
