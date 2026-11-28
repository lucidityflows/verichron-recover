import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TeamsController } from './teams.controller';
import { TeamsInternalController } from './teams.internal.controller';
import { TeamsService } from './teams.service';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { PortfolioTeamAssignment } from './entities/portfolio-team-assignment.entity';
import { EventsModule } from '../events/events.module';

/**
 * Teams Module
 *
 * Provides team management functionality for organizations including:
 * - Team CRUD operations
 * - Multi-team membership management
 * - Primary team designation
 * - Internal service-to-service endpoints for team queries
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember, PortfolioTeamAssignment]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') as any,
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') as any,
        },
      }),
      inject: [ConfigService],
    }),
    EventsModule,
  ],
  controllers: [TeamsController, TeamsInternalController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
