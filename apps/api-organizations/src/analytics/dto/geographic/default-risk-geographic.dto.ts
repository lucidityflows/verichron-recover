import { ApiProperty } from '@nestjs/swagger';
import { BaseGeographicStateDataDto } from './base-geographic-state-data.dto';
import { 
  IDefaultRiskGeographicStateData, 
  IGeographicDefaultRiskAnalytics
} from '@verichron/contracts';

export class DefaultRiskGeographicStateDataDto extends BaseGeographicStateDataDto implements IDefaultRiskGeographicStateData {
  @ApiProperty({
    description: 'The number of debtors in this state.',
    example: 1500,
  })
  debtorCount: number;

  @ApiProperty({
    description: 'The average default risk score for debtors in this state.',
    example: 0.35,
  })
  averageDefaultRiskScore: number;

  @ApiProperty({
    description: 'The number of high-risk debtors in this state.',
    example: 150,
  })
  highRisk: number;

  @ApiProperty({
    description: 'The number of medium-risk debtors in this state.',
    example: 500,
  })
  mediumRisk: number;

  @ApiProperty({
    description: 'The number of low-risk debtors in this state.',
    example: 850,
  })
  lowRisk: number;

  @ApiProperty({
    description: 'The total debt value at risk in this state.',
    example: 1200000.00,
  })
  totalDebtValueAtRisk: number;

  @ApiProperty({
    description: 'The projected loss from defaults in this state.',
    example: 420000.00,
  })
  projectedLoss: number;

  @ApiProperty({
    description: 'The recent default rate in this state.',
    example: 0.08,
  })
  recentDefaultRate: number;

  @ApiProperty({
    description: 'The number of active defaults in this state.',
    example: 75,
  })
  activeDefaultCount: number;
}

export class GeographicDefaultRiskAnalyticsDto implements IGeographicDefaultRiskAnalytics {
  @ApiProperty({
    enum: ['default-risk'],
    description: 'The type of geographic analytics, always "default-risk" for this DTO.',
    example: 'default-risk',
  })
  type: 'default-risk';

  @ApiProperty({
    description: 'The overall average default risk score across all states.',
    example: 0.32,
  })
  averageDefaultRisk: number;

  @ApiProperty({
    type: () => [DefaultRiskGeographicStateDataDto],
    description: 'A list of geographic data for default risk analytics, broken down by state.',
    example: [
      {
        state: 'CA',
        stateCode: 'CA',
        coordinates: { latitude: 34.052235, longitude: -118.243683 },
        debtorCount: 1500,
        averageDefaultRiskScore: 0.35,
        highRisk: 150,
        mediumRisk: 500,
        lowRisk: 850,
        totalDebtValueAtRisk: 1200000.00,
        projectedLoss: 420000.00,
        recentDefaultRate: 0.08,
        activeDefaultCount: 75,
      },
    ],
  })
  states: DefaultRiskGeographicStateDataDto[];
}
