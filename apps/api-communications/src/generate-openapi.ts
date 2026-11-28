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

  // Apply global pipes and filters if they affect metadata for Swagger
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: false,
      stopAtFirstError: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Verichron Communications API')
    .setDescription(
      'The Communications Microservice API - Manages notifications, messaging, and event-driven communications',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Communications', 'Communication and notification management')
    .addTag('Notifications', 'Notification delivery and tracking')
    .addTag('Messages', 'Messaging and template management')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const outputPath = join(__dirname, '../../docs/openapi/openapi-communications.json');
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
    console.log('OpenAPI spec for api-communications generated successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error generating OpenAPI spec for api-communications:', err);
    process.exit(1);
  });
