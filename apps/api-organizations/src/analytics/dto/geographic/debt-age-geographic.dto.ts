import { ApiProperty } from '@nestjs/swagger';
import { BaseGeographicStateDataDto } from './base-geographic-state-data.dto';
import { 
  IAgeBucket, 
  IRecoveryRateByAge, 
  IDebtAgeGeographicStateData, 
  IGeographicDebtAgeAnalytics
} from '@verichron/contracts';

export class AgeBucketDto implements IAgeBucket {
  @ApiProperty({
    description: 'The number of debts in this age bucket.',
    example: 150,
  })
  count: number;

  @ApiProperty({
    description: 'The total value of debts in this age bucket.',
    example: 75000.50,
  })
  totalValue: number;
}

export class RecoveryRateByAgeDto implements IRecoveryRateByAge {
  @ApiProperty({
    description: 'Recovery rate for debts aged 0-30 days.',
    example: 0.75,
  })
  '0-30': number;

  @ApiProperty({
    description: 'Recovery rate for debts aged 31-60 days.',
    example: 0.60,
  })
  '31-60': number;

  @ApiProperty({
    description: 'Recovery rate for debts aged 61-90 days.',
    example: 0.45,
  })
  '61-90': number;

  @ApiProperty({
    description: 'Recovery rate for debts aged 91-180 days.',
    example: 0.30,
  })
  '91-180': number;

  @ApiProperty({
    description: 'Recovery rate for debts aged 180-365 days.',
    example: 0.15,
  })
  '180-365': number;

  @ApiProperty({
    description: 'Recovery rate for debts aged 365+ days.',
    example: 0.05,
  })
  '365+': number;
}

export class DebtAgeGeographicStateDataDto extends BaseGeographicStateDataDto implements IDebtAgeGeographicStateData {
  @ApiProperty({
    type: () => AgeBucketDto,
    description: 'Debt analytics for debts aged 0-30 days.',
  })
  age0to30: AgeBucketDto;

  @ApiProperty({
    type: () => AgeBucketDto,
    description: 'Debt analytics for debts aged 31-60 days.',
  })
  age31to60: AgeBucketDto;

  @ApiProperty({
    type: () => AgeBucketDto,
    description: 'Debt analytics for debts aged 61-90 days.',
  })
  age61to90: AgeBucketDto;

  @ApiProperty({
    type: () => AgeBucketDto,
    description: 'Debt analytics for debts aged 91-180 days.',
  })
  age91to180: AgeBucketDto;

  @ApiProperty({
    type: () => AgeBucketDto,
    description: 'Debt analytics for debts aged 180-365 days.',
  })
  age180to365: AgeBucketDto;

  @ApiProperty({
    type: () => AgeBucketDto,
    description: 'Debt analytics for debts aged 365+ days.',
  })
  age365plus: AgeBucketDto;

  @ApiProperty({
    description: 'The total number of debts in this state.',
    example: 1000,
  })
  totalDebts: number;

  @ApiProperty({
    description: 'The total value of debts in this state.',
    example: 500000.00,
  })
  totalDebtValue: number;

  @ApiProperty({
    description: 'The average age of debts in this state in days.',
    example: 95.5,
  })
  averageDebtAge: number;

  @ApiProperty({
    type: () => RecoveryRateByAgeDto,
    description: 'Recovery rates broken down by debt age buckets for this state.',
  })
  recoveryRateByAge: RecoveryRateByAgeDto;
}

export class GeographicDebtAgeAnalyticsDto implements IGeographicDebtAgeAnalytics {
  @ApiProperty({
    enum: ['debt-age'],
    description: 'The type of geographic analytics, always "debt-age" for this DTO.',
    example: 'debt-age',
  })
  type: 'debt-age';

  @ApiProperty({
    type: () => [DebtAgeGeographicStateDataDto],
    description: 'A list of geographic data for debt age analytics, broken down by state.',
    example: [
      {
        state: 'CA',
        stateCode: 'CA',
        coordinates: { latitude: 34.052235, longitude: -118.243683 },
        age0to30: { count: 100, totalValue: 50000 },
        age31to60: { count: 80, totalValue: 40000 },
        age61to90: { count: 60, totalValue: 30000 },
        age91to180: { count: 40, totalValue: 20000 },
        age180to365: { count: 20, totalValue: 10000 },
        age365plus: { count: 10, totalValue: 5000 },
        totalDebts: 310,
        totalDebtValue: 155000,
        averageDebtAge: 75.2,
        recoveryRateByAge: {
          '0-30': 0.7,
          '31-60': 0.5,
          '61-90': 0.3,
          '91-180': 0.2,
          '180-365': 0.1,
          '365+': 0.05,
        },
      },
    ],
  })
  states: DebtAgeGeographicStateDataDto[];
}
