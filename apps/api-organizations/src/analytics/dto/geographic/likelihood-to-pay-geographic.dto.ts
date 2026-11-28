import { ApiProperty } from '@nestjs/swagger';
import { BaseGeographicStateDataDto } from './base-geographic-state-data.dto';
import { 
  ILikelihoodToPayGeographicStateData, 
  IGeographicLikelihoodToPayAnalytics
} from '@verichron/contracts';

export class LikelihoodToPayGeographicStateDataDto extends BaseGeographicStateDataDto implements ILikelihoodToPayGeographicStateData {
  @ApiProperty({
    description: 'The number of debtors in this state.',
    example: 1500,
  })
  debtorCount: number;

  @ApiProperty({
    description: 'The average likelihood to pay score for debtors in this state.',
    example: 0.65,
  })
  averageLikelihoodScore: number;

  @ApiProperty({
    description: 'The number of debtors with a high likelihood to pay in this state.',
    example: 700,
  })
  highLikelihood: number;

  @ApiProperty({
    description: 'The number of debtors with a medium likelihood to pay in this state.',
    example: 500,
  })
  mediumLikelihood: number;

  @ApiProperty({
    description: 'The number of debtors with a low likelihood to pay in this state.',
    example: 300,
  })
  lowLikelihood: number;

  @ApiProperty({
    description: 'The total debt value from debtors with a high likelihood to pay in this state.',
    example: 3500000.00,
  })
  totalDebtValueHighLikelihood: number;

  @ApiProperty({
    description: 'The projected recovery amount from debts in this state.',
    example: 2800000.00,
  })
  projectedRecovery: number;
}

export class GeographicLikelihoodToPayAnalyticsDto implements IGeographicLikelihoodToPayAnalytics {
  @ApiProperty({
    enum: ['likelihood-to-pay'],
    description: 'The type of geographic analytics, always "likelihood-to-pay" for this DTO.',
    example: 'likelihood-to-pay',
  })
  type: 'likelihood-to-pay';

  @ApiProperty({
    description: 'The overall average likelihood to pay score across all states.',
    example: 0.62,
  })
  averageLikelihoodScore: number;

  @ApiProperty({
    type: () => [LikelihoodToPayGeographicStateDataDto],
    description: 'A list of geographic data for likelihood to pay analytics, broken down by state.',
    example: [
      {
        state: 'CA',
        stateCode: 'CA',
        coordinates: { latitude: 34.052235, longitude: -118.243683 },
        debtorCount: 1500,
        averageLikelihoodScore: 0.65,
        highLikelihood: 700,
        mediumLikelihood: 500,
        lowLikelihood: 300,
        totalDebtValueHighLikelihood: 3500000.00,
        projectedRecovery: 2800000.00,
      },
    ],
  })
  states: LikelihoodToPayGeographicStateDataDto[];
}
