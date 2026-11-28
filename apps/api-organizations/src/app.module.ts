import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { join } from 'path';

// Import feature modules
import { ProfilesModule, ProfilesOpsModule } from './profiles';
import { OnboardingModule } from './onboarding';
import { AnalyticsModule } from './analytics';
import { SettingsModule, SettingsOpsModule } from './settings';
import { TeamsModule } from './teams/teams.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StrategyModule } from './strategy';

// Import guards and filters from local core
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import guards and strategies from centralized auth package
import { JwtAuthGuard, OrgContextGuard, RoleGuard, PermissionsGuard, JwtStrategy } from '@verichron/auth';

import { RequestContextInterceptor, CoreModule } from './core';
import { LoggerModule } from 'nestjs-pino';
import { EventsModule } from './events/events.module';
import { RedisModule } from './core/redis';
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
      envFilePath: '.env', // Explicitly load .env file
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
        logging: ['error', 'warn'],
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


    // 4. Redis Module
    RedisModule,

    // 5. Core Module (provides RequestContext globally)
    CoreModule,

    // 6. Feature modules
    ProfilesOpsModule,
    SettingsOpsModule,
    ProfilesModule,
    OnboardingModule,
    AnalyticsModule,
    SettingsModule,
    TeamsModule,
    EventsModule,
    RealtimeModule,
    StrategyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    // Global exception filter (catches all unhandled exceptions and logs them)
    { provide: APP_FILTER, useClass:  GlobalHttpExceptionFilter},
    // Global guards (order matters!)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: OrgContextGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Global interceptor (populates RequestContext from guards)
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    // Note: PlatformAdminGuard and PermissionsGuard are used via @UseGuards() decorator
  ],
})
export class AppModule {};