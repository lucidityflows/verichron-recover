import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '@verichron/auth';
import { ActStrategy } from './strategies/act.strategy';
import { ProfilesModule } from '../profiles/profiles.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuthContextTokenGuard } from '../core/guards';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),
    ProfilesModule,
    RbacModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ActStrategy, AuthContextTokenGuard],
  exports: [AuthService],
})
export class AuthModule {}
