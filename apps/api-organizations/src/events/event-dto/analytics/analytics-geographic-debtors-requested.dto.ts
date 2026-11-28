import { AnalyticsGeographicDebtorsRequestedPayload } from '@verichron/events';
import { IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GeographicQueryDto } from '../../../analytics/dto/geographic/geographic-query.dto';

export class AnalyticsGeographicDebtorsRequestedDto implements AnalyticsGeographicDebtorsRequestedPayload {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  correlationId: string;

  @ValidateNested()
  @Type(() => GeographicQueryDto)
  query: GeographicQueryDto;
}
