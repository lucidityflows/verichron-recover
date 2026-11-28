import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Team } from './team.entity';

/**
 * Portfolio Team Assignment Entity
 * 
 * Represents the many-to-many relationship between Portfolios and Teams.
 * This bridge table allows a single portfolio to be worked by multiple teams,
 * supporting large-scale agency operations.
 * 
 * Note: portfolioId references an entity in api-debts, so it is stored as a UUID
 * without a formal foreign key relation across microservices.
 */
@Entity('portfolio_team_assignments')
@Unique(['organizationId', 'portfolioId', 'teamId'])
export class PortfolioTeamAssignment {
  @ApiProperty({ description: 'Unique assignment identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Organization ID this assignment belongs to', format: 'uuid' })
  @Column({ type: 'uuid', name: 'organization_id' })
  @Index()
  organizationId!: string;

  @ApiProperty({ description: 'Portfolio ID from api-debts', format: 'uuid' })
  @Column({ type: 'uuid', name: 'portfolio_id' })
  @Index()
  portfolioId!: string;

  @ApiProperty({ description: 'Team ID assigned to this portfolio', format: 'uuid' })
  @Column({ type: 'uuid', name: 'team_id' })
  @Index()
  teamId!: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ApiProperty({ description: 'Timestamp when the assignment was created' })
  @CreateDateColumn({ type: 'timestamp', name: 'assigned_at' })
  assignedAt!: Date;
}
