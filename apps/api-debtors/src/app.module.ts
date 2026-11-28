import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

// Import feature modules
import { ProfilesModule } from './profiles';
import { DemographicsModule } from './demographics';
import { DocumentsModule } from './documents';
import { VerificationModule } from './verifications';
import { EventsModule } from './events';
import { CoreModule } from './core/core.module';
import { IdentityModule } from './identity'; // NEW
import { ContactModule } from './contact';   // NEW
import { ImportsModule } from './imports';   // NEW
import { InternalAnalyticsModule } from './internal/analytics/analytics.module';

import {
  JwtAuthGuard,
  OrgContextGuard,
  RoleGuard,
  PermissionsGuard,
  JwtStrategy,
} from '@verichron/auth';

import { RequestContextInterceptor } from './core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';


@Module({
  imports: [
    // 0. Logger Module
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
            colorize: true,
          },
        },
      },
    }),

    // 1. Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Configure TypeORM dynamically - each service owns its own database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // Use the single DATABASE_URL variable from docker-compose
        url: configService.get<string>('DATABASE_URL'),

        // Point to entities ONLY within this specific service
        entities: [join(__dirname, '**', '*.entity.js')],

        // We manage migrations manually via the CLI, don't run them automatically
        migrationsRun: false,

        // Enable synchronize for test environment to auto-create schema
        synchronize: false,

        // Simple logging toggle
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // 3. JWT configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: (configService.get('JWT_EXPIRES_IN') || '15m') as any },
      }),
      inject: [ConfigService],
    }),

    // 4. Core module (provides RequestContext globally)
    CoreModule,

    // 5. Feature modules
    ProfilesModule,
    DemographicsModule,
    DocumentsModule,
    VerificationModule,
    EventsModule,
    IdentityModule, // NEW
    ContactModule,  // NEW
    ImportsModule,  // NEW
    InternalAnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    { provide: APP_FILTER, useClass:  GlobalHttpExceptionFilter},
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: OrgContextGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}
