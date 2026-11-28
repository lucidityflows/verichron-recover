import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  // Use Pino Logger
  app.useLogger(app.get(PinoLogger));

  const configService = app.get(ConfigService);
  const port = process.env.PORT || 3006;

  // Set global prefix for Load Balancer routing
  app.setGlobalPrefix('v1', {
    exclude: [
      'ops/(.*)',
      'internal/(.*)',
      'public/(.*)',
      'health',
    ],
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS (if needed for webhook testing)
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

  // Health check endpoint
  // TODO: Create proper health check controller instead of using app.get()
  // NestJS doesn't expose Express methods directly on the app instance
  // app.get('/health', (req, res) => {
  //   res.status(200).json({
  //     status: 'ok',
  //     service: 'api-communications',
  //     timestamp: new Date().toISOString(),
  //   });
  // });

  await app.listen(port);
  
  logger.log(`🚀 API-Communications service running on port ${port}`);
  logger.log(`📧 Email provider: ${configService.get('EMAIL_PROVIDER')}`);
  logger.log(`📱 SMS provider: ${configService.get('SMS_PROVIDER')}`);
}

bootstrap();