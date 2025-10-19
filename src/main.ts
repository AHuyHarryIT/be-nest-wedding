import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  PrismaExceptionFilter,
  PrismaClientExceptionFilter,
} from './common/filters/prisma-exception';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for cookie handling
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:4200',
    ],
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  // Cookie parser middleware
  app.use(cookieParser());

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global filters (order matters - more specific first)
  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new PrismaClientExceptionFilter(),
    new HttpExceptionFilter(),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Wedding Management API')
    .setDescription(
      'Complete Wedding Management System API with Cookie-based JWT Authentication, RBAC, and comprehensive endpoints for managing wedding services, bookings, and user accounts.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Enter JWT token (or tokens will be read from cookies automatically)',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addServer('http://localhost:3000', 'Development server')
    .addTag(
      'Authentication',
      'Cookie-based user authentication and account management',
    )
    .addTag('Roles', 'Role management endpoints')
    .addTag('Permissions', 'Permission management endpoints')
    .addTag('Products', 'Product management endpoints')
    .addTag('Services', 'Service management endpoints')
    .addTag('Packages', 'Package management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
