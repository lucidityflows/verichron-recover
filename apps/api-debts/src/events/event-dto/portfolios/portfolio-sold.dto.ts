import { PortfolioSoldPayload } from '@verichron/events';
import { IsUUID, IsDateString, IsString, IsOptional } from 'class-validator';

/**
 * **CRITICAL EVENT DTO** - Portfolio Sold (Ownership Transfer)
 *
 * This validates the most critical event in the debts domain.
 * When a portfolio is sold, it triggers:
 * 1. Update organizationId on all debts in the portfolio
 * 2. Create debt_ownership_history records for legal audit trail
 * 3. Clear user_portfolio_permission records (old org loses access)
 *
 * This event must be validated rigorously as it affects:
 * - Legal compliance (chain of title)
 * - FDCPA requirements (ownership disclosure)
 * - Multi-tenant data isolation
 */
export class PortfolioSoldDto implements PortfolioSoldPayload {
  @IsUUID()
  portfolioId: string;

  @IsUUID()
  previousOrganizationId: string;

  @IsUUID()
  newOrganizationId: string;

  @IsDateString()
  transferDate: string;

  @IsString()
  @IsOptional()
  transferPrice?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  soldBy: string;

  @IsDateString()
  soldAt: string;
}
