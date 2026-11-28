import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Local, service-specific configurations
import { TypeOrmConfigService } from './config/typeorm.config';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ProfilesOpsModule } from './profiles/profiles.ops.module';
import { RbacModule } from './rbac/rbac.module';
import { RbacOpsModule } from './rbac/rbac.ops.module';

// Shared Modules
import { RedisModule } from './redis/redis.module';

// Centralized Auth Guards
import { JwtAuthGuard, PermissionsGuard } from '@verichron/auth';

// App-level Controller and Service
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from 'nestjs-pino';
import { EventsModule } from './events/event.module';

if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

@Module({
  imports: [
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Specifies the .env file to be loaded
    }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),
    AuthModule,
    ProfilesOpsModule,
    RbacOpsModule,
    ProfilesModule,
    RbacModule,
    RedisModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})

export class AppModule {};