import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

// Import feature modules
import { WorkQueueModule } from './work-queue/work-queue.module';
import { WorkstationModule } from './workstation/workstation.module';
import { CollectorProfileModule } from './profiles/collector-profile.module';
import { PerformanceModule } from './performance/performance.module';
import { CollectorNoteModule } from './notes/notes.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { NotificationModule } from './notifications/notifications.module';
import { EventsModule } from './events/events.module';
import { GoalsModule } from './goals/goals.module';
import { FloorModule } from './floor/floor.module';
import { RedisModule, CoreModule } from './core';


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
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';

if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

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
      envFilePath: '.env',
    }),

    // 2. Redis Module
    RedisModule,

    // 3. Configure TypeORM dynamically
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [join(__dirname, '**', '*.entity.js')],
        migrationsRun: false,
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),

    // 3. JWT configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '60s') as any,
        },
      }),
      inject: [ConfigService],
    }),

    // 4. Core module (provides RequestContext globally)
    CoreModule,
    
    // 5. Feature modules
    WorkQueueModule,
    WorkstationModule,
    CollectorProfileModule,
    PerformanceModule,
    CollectorNoteModule,
    TimeTrackingModule,
    NotificationModule,
    EventsModule,
    GoalsModule,
    FloorModule,
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
