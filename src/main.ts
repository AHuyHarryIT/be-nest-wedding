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

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

const isLoopbackHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1';

const resolveAllowedOrigins = (): string[] => {
  const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (configuredOrigins && configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return DEFAULT_ALLOWED_ORIGINS;
};

const createCorsOriginValidator = (allowedOrigins: string[]) => {
  const normalizedAllowedOrigins = allowedOrigins
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ): void => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (normalizedAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    try {
      const requestOriginUrl = new URL(origin);
      if (!isLoopbackHost(requestOriginUrl.hostname)) {
        callback(new Error(`Not allowed by CORS: ${origin}`), false);
        return;
      }

      const hasLoopbackEquivalentOrigin = normalizedAllowedOrigins.some(
        (allowedOrigin) => {
          try {
            const allowedOriginUrl = new URL(allowedOrigin);
            return (
              isLoopbackHost(allowedOriginUrl.hostname) &&
              allowedOriginUrl.protocol === requestOriginUrl.protocol &&
              allowedOriginUrl.port === requestOriginUrl.port
            );
          } catch {
            return false;
          }
        },
      );

      if (hasLoopbackEquivalentOrigin) {
        callback(null, true);
        return;
      }
    } catch {
      callback(new Error(`Not allowed by CORS: ${origin}`), false);
      return;
    }

    callback(new Error(`Not allowed by CORS: ${origin}`), false);
  };
};

async function bootstrap() {
  const allowedOrigins = resolveAllowedOrigins();
  const corsOriginValidator = createCorsOriginValidator(allowedOrigins);

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: corsOriginValidator,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    },
  });

  // Enable CORS for REST API (Express)
  app.enableCors({
    origin: corsOriginValidator,
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
