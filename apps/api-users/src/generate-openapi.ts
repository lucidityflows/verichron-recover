import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from './core';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';
import { Logger } from 'nestjs-pino';

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
  // Disable logger for OpenAPI generation to reduce noise
  // app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Verichron Users API')
    .setDescription('The Users & Authentication Microservice API documentation')
    .setVersion('1.0')
    .addBearerAuth() // For the main JWT
    .addCookieAuth('act') // For the Authentication Context Token
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Write OpenAPI spec to shared docs location
  const outputPath = join(__dirname, '../../docs/openapi/openapi-users.json');
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
    console.log('OpenAPI spec for api-users generated successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error generating OpenAPI spec for api-users:', err);
    process.exit(1);
  });
