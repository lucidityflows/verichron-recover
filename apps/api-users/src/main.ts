import 'reflect-metadata'; // Required for class-transformer
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
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

  // Use cookie parser middleware for ACT flow
  app.use(cookieParser());

  // Use custom global validation pipe
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Use global filter for error-handling standardization
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global prefix for namespace-first routing
  app.setGlobalPrefix('v1', {
    exclude: [
      'ops/(.*)',
      'internal/(.*)',
      'public/(.*)',
      'health',
    ],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Users microservice is running on port ${port}`);
}
bootstrap();

