import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

/**
 * Bootstrap the SoilViews API application.
 *
 * Key features:
 * - Swagger/OpenAPI documentation
 * - CORS configuration for multi-origin support
 * - Security headers (Helmet)
 * - Request compression
 * - Global validation pipe
 * - Cookie parser for session management
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Security middleware
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: configService.get('API_CORS_ORIGIN')?.split(',') || ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if extra properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert types (string -> number)
      },
    })
  );

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('SoilViews API')
    .setDescription(
      'Research-backed agricultural intelligence platform for Bulgarian farmers. ' +
        'Combines Sentinel-2 satellite imagery with ground-truth soil sampling to deliver ' +
        'soil property maps, VRA prescriptions, and insurance risk scoring.'
    )
    .setVersion('1.0')
    .setContact(
      'SoilViews Team',
      'https://soilviews.bg',
      'support@soilviews.bg'
    )
    .setLicense('Apache 2.0', 'https://www.apache.org/licenses/LICENSE-2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login',
      },
      'JWT-auth'
    )
    .addTag('auth', 'Authentication endpoints (JWT + eIDAS)')
    .addTag('users', 'User management')
    .addTag('organizations', 'Multi-tenant organization management')
    .addTag('fields', 'Field parcels (farmer land)')
    .addTag('surveys', 'Ground-truth soil surveys')
    .addTag('maps', 'Soil property maps (AI-generated)')
    .addTag('prescriptions', 'Variable Rate Application (VRA) prescriptions')
    .addTag('insurance', 'Insurance risk scoring and anomaly detection')
    .addServer('http://localhost:3000', 'Local development')
    .addServer('https://api.soilviews.bg', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Serve Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'SoilViews API Documentation',
    customfavIcon: 'https://soilviews.bg/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = configService.get('API_PORT') || 3000;
  await app.listen(port);

  console.log(`🌾 SoilViews API running on: http://localhost:${port}`);
  console.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`📊 Health Check: http://localhost:${port}/api/health`);
}

bootstrap();
