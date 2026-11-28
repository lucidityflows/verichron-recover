import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { EventPublisherModule } from '@verichron/event-publisher';
import { EVENT_SOURCES } from '@verichron/events';

// Import feature modules
import { PlansModule } from './payment-plans/payment-plan.module';
import { TransactionsModule } from './transactions/transaction.module';
import { DocumentsModule } from './documents/document.module';
import { GatewaysModule } from './gateways/gateway.module';
import { CoreModule } from './core/core.module';
import { InternalAnalyticsModule } from './internal/analytics/analytics.module';
import { SettlementOffersModule } from './settlement-offers/settlement-offers.module';
import { BankruptcyFilingsModule } from './bankruptcy-filings/bankruptcy-filings.module';
import { TransactionsOpsModule } from './transactions.ops.module';

// Import guards and filters from local core
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
import { EventsModule } from './events/events.module';
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
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-change-in-production',
        signOptions: {
          expiresIn: (configService.get('JWT_EXPIRES_IN') || '1h') as any,
        },
      }),
      inject: [ConfigService],
    }),

    // 4. Core module (provides RequestContext globally)
    CoreModule,

    // 5. Feature modules
    EventsModule,
    PlansModule,
    TransactionsModule,
    DocumentsModule,
    GatewaysModule,
    InternalAnalyticsModule,
    SettlementOffersModule,
    BankruptcyFilingsModule,
    TransactionsOpsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    // Global interceptor - populates RequestContext from JWT
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    // Global exception filter (catches all unhandled exceptions and logs them)
    { provide: APP_FILTER, useClass:  GlobalHttpExceptionFilter},
    // Global guards - executed in order: JWT -> OrgContext -> Role -> Permissions
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: OrgContextGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
