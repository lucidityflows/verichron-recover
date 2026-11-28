import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from './core';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';

async function generateOpenApiSpec() {
  // Create app without initializing connections (abortOnError: false allows continuing even if connections fail)
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false
  });

  // Must match the global prefix in main.ts so generated paths are correct
  app.setGlobalPrefix('v1', {
    exclude: [
      'ops/(.*)',
      'internal/(.*)',
      'public/(.*)',
      'health',
    ],
  });

  // Apply global pipes and filters if they affect metadata for Swagger
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Verichron Analytics API')
    .setDescription('Centralized Analytics & Reporting Microservice')
    .setVersion('1.0')
    .addBearerAuth() // For the main JWT
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Write OpenAPI spec to shared docs location
  const outputPath = join(__dirname, '../../docs/openapi/openapi-analytics.json');
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
    console.log('OpenAPI spec for api-analytics generated successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error generating OpenAPI spec for api-analytics:', err);
    process.exit(1);
  });
