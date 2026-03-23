import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import {
  GlobalExceptionFilter,
  GlobalValidationPipe,
} from './common/exceptions';
import {
  PrismaExceptionFilter,
  PrismaClientExceptionFilter,
} from './common/filters/prisma-exception';
import { setupSwagger } from './common/config/swagger.config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:4200',
    'http://localhost:5173',
    'http://localhost:5174',
  ];

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    },
  });

  // Enable CORS for REST API (Express)
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  // Cookie parser middleware
  app.use(cookieParser());

  // Global pipes - Custom validation pipe with enhanced error formatting
  app.useGlobalPipes(
    new GlobalValidationPipe(),
    new ValidationPipe({ transform: true }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global filters (order matters - more specific first)
  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new PrismaClientExceptionFilter(),
    new GlobalExceptionFilter(),
  );

  // Setup Swagger documentation with centralized configuration
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
