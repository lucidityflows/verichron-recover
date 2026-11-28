import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, { logger: false });

  // Must match the global prefix in main.ts so generated paths are correct
  app.setGlobalPrefix('v1', {
    exclude: [
      'ops/(.*)',
      'internal/(.*)',
      'public/(.*)',
      'health',
    ],
  });

  await app.init();

  // Global Exception Filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: false,
      stopAtFirstError: false,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Verichron Collectors API')
    .setDescription('The Collectors Microservice API - Collector workstation, work queue, prioritization, and debtor focus')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Work Queue', 'Collector work queue management and prioritization')
    .addTag('Collector', 'Debtor focus view and collector action logging')
    .addTag('Internal', 'Internal endpoints for service-to-service communication')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const outputPath = join(__dirname, '../../docs/openapi/openapi-collectors.json');
  const outputDir = dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(
    outputPath,
    JSON.stringify(document, null, 2)
  );

  await app.close();
}

generateOpenApiSpec()
  .then(() => {
    console.log('OpenAPI spec for api-collectors generated successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error generating OpenAPI spec for api-collectors:', err);
    process.exit(1);
  });