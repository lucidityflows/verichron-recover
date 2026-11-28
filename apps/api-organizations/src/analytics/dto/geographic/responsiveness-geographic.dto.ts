import { ApiProperty } from '@nestjs/swagger';
import { BaseGeographicStateDataDto } from './base-geographic-state-data.dto';
import { 
  IResponsivenessGeographicStateData, 
  IGeographicResponsivenessAnalytics
} from '@verichron/contracts';

export class ResponsivenessGeographicStateDataDto extends BaseGeographicStateDataDto implements IResponsivenessGeographicStateData {
  @ApiProperty({
    description: 'The total number of debtors contacted in this state.',
    example: 1000,
  })
  totalDebtorsContacted: number;

  @ApiProperty({
    description: 'The number of debtors who responded in this state.',
    example: 750,
  })
  responsiveDebtors: number;

  @ApiProperty({
    description: 'The number of debtors who did not respond in this state.',
    example: 250,
  })
  unresponsiveDebtors: number;

  @ApiProperty({
    description: 'The rate of responsiveness among contacted debtors in this state.',
    example: 0.75,
  })
  responsivenessRate: number;

  @ApiProperty({
    description: 'The average number of contact attempts per debtor in this state.',
    example: 3.2,
  })
  averageContactAttempts: number;

  @ApiProperty({
    description: 'The average response time from debtors in this state (in hours).',
    example: 24.5,
  })
  averageResponseTime: number;

  @ApiProperty({
    enum: ['phone', 'email', 'sms', 'mail'],
    description: 'The most preferred contact method in this state.',
    example: 'email',
  })
  preferredContactMethod: 'phone' | 'email' | 'sms' | 'mail';
}

export class GeographicResponsivenessAnalyticsDto implements IGeographicResponsivenessAnalytics {
  @ApiProperty({
    enum: ['responsiveness'],
    description: 'The type of geographic analytics, always "responsiveness" for this DTO.',
    example: 'responsiveness',
  })
  type: 'responsiveness';

  @ApiProperty({
    description: 'The total number of debtors contacted across all states.',
    example: 10000,
  })
  totalContacted: number;

  @ApiProperty({
    description: 'The total number of responsive debtors across all states.',
    example: 7500,
  })
  responsive: number;

  @ApiProperty({
    description: 'The total number of unresponsive debtors across all states.',
    example: 2500,
  })
  unresponsive: number;

  @ApiProperty({
    type: () => [ResponsivenessGeographicStateDataDto],
    description: 'A list of geographic data for responsiveness analytics, broken down by state.',
    example: [
      {
        state: 'CA',
        stateCode: 'CA',
        coordinates: { latitude: 34.052235, longitude: -118.243683 },
        totalDebtorsContacted: 1000,
        responsiveDebtors: 750,
        unresponsiveDebtors: 250,
        responsivenessRate: 0.75,
        averageContactAttempts: 3.2,
        averageResponseTime: 24.5,
        preferredContactMethod: 'email',
      },
    ],
  })
  states: ResponsivenessGeographicStateDataDto[];
}
