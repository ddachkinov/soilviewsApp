import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { FieldsModule } from './fields/fields.module';
import { SurveysModule } from './surveys/surveys.module';
import { MapsModule } from './maps/maps.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { InsuranceModule } from './insurance/insurance.module';
import { SentinelHubModule } from './sentinel-hub/sentinel-hub.module';
import { CadastreModule } from './cadastre/cadastre.module';

// Common modules
import { HealthController } from './common/health.controller';

/**
 * Root application module for SoilViews API.
 *
 * Architecture:
 * - ConfigModule: Environment variables and configuration
 * - TypeOrmModule: PostgreSQL + PostGIS database connection
 * - BullModule: Redis-based job queue for background tasks
 * - Feature modules: Domain-specific business logic
 *
 * References:
 * - ADR-001: Monorepo structure
 * - ADR-005: PostgreSQL partitioning by crop-year
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Database (PostgreSQL + PostGIS)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: false, // NEVER true in production
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('DATABASE_SSL') === 'true',
        extra: {
          // Connection pool settings
          max: configService.get<number>('DATABASE_POOL_MAX') || 10,
          min: configService.get<number>('DATABASE_POOL_MIN') || 2,
        },
      }),
    }),

    // Redis queue (for background jobs)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB') || 0,
        },
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    FieldsModule,
    SurveysModule,
    MapsModule,
    PrescriptionsModule,
    InsuranceModule,
    SentinelHubModule,
    CadastreModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
