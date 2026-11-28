import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Team } from './team.entity';
import { TeamMemberRole } from '@verichron/enums';



@Entity('team_members')
@Index(['userId']) // Index for quick lookup of user's teams
@Unique(['teamId', 'userId']) // Ensures a user can only be in a team once
export class TeamMember {
  @ApiProperty({ description: 'ID of the team', format: 'uuid' })
  @PrimaryColumn({ type: 'uuid', name: 'team_id' })
  teamId!: string;

  @ApiProperty({ description: 'User ID of the team member (from api-users)', format: 'uuid' })
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ApiProperty({ description: 'Whether this is the user\'s primary team', default: false })
  @Column({ type: 'boolean', name: 'is_primary', default: false })
  isPrimary!: boolean;

  @ApiProperty({ description: 'Role of the member within this team', enum: TeamMemberRole, default: TeamMemberRole.MEMBER })
  @Column({ type: 'varchar', length: 50, name: 'role_on_team', default: TeamMemberRole.MEMBER })
  roleOnTeam!: TeamMemberRole;

  @ApiProperty({ description: 'Timestamp when the user joined the team' })
  @CreateDateColumn({ type: 'timestamp', name: 'joined_at' })
  joinedAt!: Date;

  @ManyToOne(() => Team, team => team.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;
}
