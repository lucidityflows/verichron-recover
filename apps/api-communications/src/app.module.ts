import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

// Event infrastructure
import { EventPublisherModule } from '@verichron/event-publisher';
import { EventSubscriberModule } from '@verichron/event-subscriber';
import { EVENT_SOURCES } from '@verichron/events';

// Config
import databaseConfig from './config/database.config';
import mongodbConfig from './config/mongodb.config';
import gatewayConfig from './config/gateway.config';
import redisConfig from './config/redis.config';

// Feature Modules
import { EventsModule } from './events/events.module';
import { TemplatesModule } from './templates/templates.module';
import { LogsModule } from './logs/logs.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { GatewaysModule } from './gateways/gateways.module';
import { ComplianceModule } from './compliance/compliance.module';
import { PreferencesModule } from './preferences/preferences.module';
import { InternalAnalyticsModule } from './internal/analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SandboxOpsModule } from './sandbox/sandbox.ops.module';
import { CommunicationsOpsModule } from './communications.ops.module';

import {
  CoreModule,
  RequestContextInterceptor,
  
} from './core';

// Import guards and strategies from centralized auth package
import {
  JwtAuthGuard,
  OrgContextGuard,
  RoleGuard,
  PermissionsGuard,
  JwtStrategy,
} from '@verichron/auth';

// App
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';

/**
 * API-Communications Application Module
 *
 * Event-driven communication orchestration service.
 * Handles email, SMS, and letter communications via third-party gateways.
 *
 * Architecture:
 * - Dual Database: PostgreSQL (structured data) + MongoDB (high-volume logs)
 * - Event-Driven: Subscribes to platform events to trigger communications
 * - Gateway Abstraction: SendGrid (email), Twilio (SMS), with mock providers for testing
 * - Compliance Engine: FDCPA/TCPA enforcement before dispatch
 */
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

    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, mongodbConfig, gatewayConfig, redisConfig],
    }),

    // PostgreSQL - Structured data (templates, preferences)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...config.get('database'),
        entities: [__dirname + '/**/*.entity.js'],
      }),
    }),

    // MongoDB - High-volume logs
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('mongodb.uri'),
        ...config.get('mongodb.options'),
      }),
    }),

    // JWT Authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: (configService.get('JWT_EXPIRES_IN') || '15m') as any },
      }),
      inject: [ConfigService],
    }),

    // Core Module (provides RequestContext globally)
    CoreModule,

    // Feature Modules (Order matters - dependencies first)
    EventsModule,
    GatewaysModule,      // Provides gateway services (SendGrid, Twilio, Mock)
    ComplianceModule,    // Compliance rules engine
    TemplatesModule,     // Template management and rendering
    LogsModule,          // Communication logs (MongoDB)
    PreferencesModule,   // Debtor communication preferences
    DispatchModule,      // Orchestrates dispatch (depends on all above)
    NotificationsModule, // Event listeners for notifications
    SandboxOpsModule,
    CommunicationsOpsModule,
    InternalAnalyticsModule, // Internal analytics for event orchestrator
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    { provide: APP_FILTER, useClass: GlobalHttpExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: OrgContextGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}