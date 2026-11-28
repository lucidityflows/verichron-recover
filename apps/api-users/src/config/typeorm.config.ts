import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV');

    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [__dirname + '/../**/*.entity.js'],
      // Migrations should be run from the CLI, not by the app
      migrations: [],
      // Enable synchronize for test environment to auto-create schema
      synchronize: false,
      logging: ['error', 'warn'],
    };
  }
}
