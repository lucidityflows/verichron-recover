import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { AppModule } from './app.module';

// Import validation pipe from local core
import { ValidationPipe } from './core';

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

  // Use custom global validation pipe
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Verichron Debts API')
    .setDescription('The Debts & Portfolios Microservice API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  
  const outputPath = join(__dirname, '../../docs/openapi/openapi-debts.json');
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
    console.log('OpenAPI spec for api-debts generated successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error generating OpenAPI spec for api-debts:', err);
    process.exit(1);
  });
