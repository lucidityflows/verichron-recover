import { ApiProperty } from '@nestjs/swagger';
import { BaseGeographicStateDataDto } from './base-geographic-state-data.dto';
import { 
  IPaymentPlanGeographicStateData, 
  IGeographicPaymentPlanAnalytics
} from '@verichron/contracts';

export class PaymentPlanGeographicStateDataDto extends BaseGeographicStateDataDto implements IPaymentPlanGeographicStateData {
  @ApiProperty({
    description: 'The number of active payment plans in this state.',
    example: 500,
  })
  activePaymentPlanCount: number;

  @ApiProperty({
    description: 'The total debt value under active payment plans in this state.',
    example: 2500000.00,
  })
  activePaymentPlanDebtValue: number;

  @ApiProperty({
    description: 'The average monthly payment across all active payment plans in this state.',
    example: 150.75,
  })
  averageMonthlyPayment: number;

  @ApiProperty({
    description: 'The number of completed payment plans in this state.',
    example: 300,
  })
  completedPaymentPlanCount: number;

  @ApiProperty({
    description: 'The total amount recovered from completed payment plans in this state.',
    example: 1800000.00,
  })
  completedPaymentPlanTotalRecovered: number;

  @ApiProperty({
    description: 'The average completion time for payment plans in this state, in months.',
    example: 12.5,
  })
  averageCompletionTimeMonths: number;

  @ApiProperty({
    description: 'The success rate of payment plans in this state.',
    example: 0.75,
  })
  paymentPlanSuccessRate: number;

  @ApiProperty({
    description: 'The average compliance rate for payment plans in this state.',
    example: 0.88,
  })
  averageComplianceRate: number;
}

export class GeographicPaymentPlanAnalyticsDto implements IGeographicPaymentPlanAnalytics {
  @ApiProperty({
    enum: ['payment-plans'],
    description: 'The type of geographic analytics, always "payment-plans" for this DTO.',
    example: 'payment-plans',
  })
  type: 'payment-plans';

  @ApiProperty({
    description: 'The total number of debtors with payment plans across all states.',
    example: 800,
  })
  totalDebtorsWithPlans: number;

  @ApiProperty({
    description: 'The total number of active payment plans across all states.',
    example: 500,
  })
  activePlans: number;

  @ApiProperty({
    description: 'The total number of completed payment plans across all states.',
    example: 300,
  })
  completedPlans: number;

  @ApiProperty({
    description: 'The total number of payment plans across all states.',
    example: 800,
  })
  totalPlans: number;

  @ApiProperty({
    type: () => [PaymentPlanGeographicStateDataDto],
    description: 'A list of geographic data for payment plan analytics, broken down by state.',
    example: [
      {
        state: 'CA',
        stateCode: 'CA',
        coordinates: { latitude: 34.052235, longitude: -118.243683 },
        activePaymentPlanCount: 500,
        activePaymentPlanDebtValue: 2500000.00,
        averageMonthlyPayment: 150.75,
        completedPaymentPlanCount: 300,
        completedPaymentPlanTotalRecovered: 1800000.00,
        averageCompletionTimeMonths: 12.5,
        paymentPlanSuccessRate: 0.75,
        averageComplianceRate: 0.88,
      },
    ],
  })
  states: PaymentPlanGeographicStateDataDto[];
}
