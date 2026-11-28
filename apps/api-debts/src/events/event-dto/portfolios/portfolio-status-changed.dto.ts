import { PortfolioStatusChangedPayload } from '@verichron/events';
import { PortfolioStatus } from '@verichron/enums';
import { IsUUID, IsEnum, IsDateString } from 'class-validator';

export class PortfolioStatusChangedDto implements PortfolioStatusChangedPayload {
  @IsUUID()
  portfolioId: string;

  @IsUUID()
  organizationId: string;

  @IsEnum(PortfolioStatus)
  oldStatus: PortfolioStatus;

  @IsEnum(PortfolioStatus)
  newStatus: PortfolioStatus;

  @IsUUID()
  updatedBy: string;

  @IsDateString()
  updatedAt: string;
}
