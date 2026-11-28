import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';

// Import feature modules
import { EventsModule } from './events';
import { CoreModule } from './core/core.module';
import { DashboardsModule } from './dashboards/dashboards.module';

// Import guards and filters from local core
import {
  JwtAuthGuard,
  OrgContextGuard,
  RoleGuard,
  PermissionsGuard,
  JwtStrategy,
} from '@verichron/auth';
import { GlobalHttpExceptionFilter } from '@verichron/error-handling';

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

    // 3. HttpModule for probing other services
    HttpModule,

    // 4. JWT configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: (configService.get('JWT_EXPIRES_IN') || '15m') as any },
      }),
      inject: [ConfigService],
    }),

    // 5. Core module (provides RequestContext globally)
    CoreModule,

    // 6. Feature modules
    EventsModule,
    DashboardsModule,

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
