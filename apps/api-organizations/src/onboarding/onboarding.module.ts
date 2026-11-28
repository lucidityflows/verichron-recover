import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { Organization } from '../profiles/entities';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { OnboardingInternalController } from './onboarding.internal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'defaultSecret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [OnboardingController, OnboardingInternalController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}