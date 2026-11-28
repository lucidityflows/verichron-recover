import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import type { Portfolio } from './portfolio.entity';

/**
 * UserPortfolioPermission Entity
 *
 * **CRITICAL: This is the Layer 2 authorization mechanism for debt access control.**
 *
 * Grants users access to work on all debts within a specific portfolio.
 * This implements the portfolio-level access control described in the architecture.
 *
 * Authorization Layers:
 * - Layer 1 (JWT): User has general permission like "debt:read" or "debt:update"
 * - Layer 2 (This Table): User has access to specific portfolios to apply those permissions
 *
 * Example Authorization Flow:
 * 1. User has JWT with "debt:update" permission (Layer 1: ✅)
 * 2. User tries to update debt in portfolio ABC
 * 3. System checks: Does user_portfolio_permission exist for (userId, portfolioId=ABC)?
 * 4. If yes: Allow (Layer 2: ✅). If no: Deny (Layer 2: ❌)
 *
 * Key Design Principles:
 * - Boolean access model: User either has full access or no access (MVP simplicity)
 * - No granular permission levels yet (e.g., READ_ONLY vs COLLECTOR)
 * - Assignment is explicit via portfolio management endpoints
 * - Records are immutable after creation (only insert/delete, no updates)
 *
 * Business Rules:
 * - User must belong to same organization as portfolio (enforced at application layer)
 * - User can be assigned to multiple portfolios
 * - Portfolio can have multiple users assigned
 * - Unique constraint prevents duplicate assignments
 *
 * Note: The actual user records are managed by api-users microservice.
 * This entity only stores the userId (UUID reference) for loose coupling.
 */
@Entity({ name: 'user_portfolio_permission' })
@Index(['userId', 'portfolioId'], { unique: true })
@Index(['portfolioId'])
@Index(['userId'])
export class UserPortfolioPermission {
  @ApiProperty({
    description: 'Unique permission record identifier',
    example: '2c8d5e4b-9a1c-4f7e-8b3d-6a9c1e5d7f2b',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Foreign key to the user record (managed by api-users service)',
    example: '3d2e5f4b-1c9a-4e7d-8b2f-6a5c9e1d3f8b',
    format: 'uuid',
  })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty({
    description: 'Foreign key to the portfolio record',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @Column({ name: 'portfolio_id', type: 'uuid' })
  portfolioId: string;

  @ApiProperty({
    description: 'Timestamp when the permission was granted',
    example: '2024-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Many-to-one relationship back to the portfolio.
   * Using type string to avoid circular dependency issues.
   */
  @ManyToOne('Portfolio', (portfolio: Portfolio) => portfolio.userPermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: Portfolio;
}
