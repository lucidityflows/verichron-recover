import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

// Import feature modules
import { DebtsModule } from './debts/debts.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { HistoryModule } from './history/debt-ownership-history.module';
import { EventsModule } from './events/events.module';
import { ImportsModule } from './imports/imports.module';
import { RedisModule } from './redis/redis.module';
import { CoreModule } from './core/core.module';
import { InternalAnalyticsModule } from './internal/analytics/analytics.module';
import { CreditorsModule } from './creditors/creditors.module';
import { CreditorsOpsModule } from './creditors/creditors.ops.module';
import { ChargeOffsModule } from './charge-offs/charge-offs.module';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';


// Import guards and strategies from centralized auth package
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

    // 4. Redis for caching and read models
    RedisModule,

    // 5. Core module (provides RequestContext globally)
    CoreModule,

    // 6. Feature modules
    EventsModule,
    DebtsModule,
    PortfoliosModule,
    HistoryModule,
    ImportsModule,
    InternalAnalyticsModule,
    CreditorsOpsModule,
    CreditorsModule,
    ChargeOffsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    // Global exception filter (catches all unhandled exceptions and logs them)
    { provide: APP_FILTER, useClass: GlobalHttpExceptionFilter },
    // Global guards (order matters!)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: OrgContextGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Global interceptor (populates RequestContext from guards)
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}
