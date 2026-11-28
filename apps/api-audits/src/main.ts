// apps/api-workqueue/src/main.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino Logger
  app.useLogger(app.get(PinoLogger));

  // Enable CORS for UI microfrontends
  app.enableCors({
    origin: [
      'http://localhost:5173', // ui-auth
      'http://localhost:5174', // ui-platform
      'http://localhost:5175', // ui-organizations
      'http://localhost:5176', // ui-collectors
      'http://localhost:5177', // ui-debtors
      'http://localhost:5178', // ui-sales
      'https://verichroninc.com',
      'https://www.verichroninc.com',
      'https://auth.staging.verichroninc.com',
      'https://app.staging.verichroninc.com',
      'https://collect.staging.verichroninc.com',
      'https://ops.staging.verichroninc.com',
    ],
    credentials: true,
  });

  // Global Exception Filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Set global prefix for Load Balancer routing
  app.setGlobalPrefix('v1', {
    exclude: [
      'ops/(.*)',
      'internal/(.*)',
      'public/(.*)',
      'health',
    ],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      stopAtFirstError: false,
    }),
  );

  const port = process.env.PORT || 3012;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Audits microservice is running on port ${port}`);
}
bootstrap();
