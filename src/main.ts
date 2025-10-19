import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import {
  PrismaExceptionFilter,
  PrismaClientExceptionFilter,
} from './common/filters/prisma-exception';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    .setTitle('RBAC API')
    .setDescription('Role-Based Access Control API with standardized responses')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
