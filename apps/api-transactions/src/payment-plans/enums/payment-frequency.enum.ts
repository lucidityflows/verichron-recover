/**
 * Payment Frequency Enum
 *
 * Defines how often scheduled payments occur in a payment plan.
 */
export enum PaymentFrequency {
  /**
   * Payments occur every 7 days
   */
  WEEKLY = 'WEEKLY',

  /**
   * Payments occur every 14 days
   */
  BI_WEEKLY = 'BI_WEEKLY',

  /**
   * Payments occur every month on the same date
   */
  MONTHLY = 'MONTHLY',
}

/**
 * Calculate Next Payment Date
 *
 * Given a current payment date and frequency, calculates the next scheduled payment date.
 *
 * @param currentDate Current payment date
 * @param frequency Payment frequency
 * @returns Next payment date
 */
export function calculateNextPaymentDate(
  currentDate: Date,
  frequency: PaymentFrequency,
): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case PaymentFrequency.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case PaymentFrequency.BI_WEEKLY:
      nextDate.setDate(nextDate.getDate() + 14);
      break;

    case PaymentFrequency.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;

    default:
      throw new Error(`Unsupported payment frequency: ${frequency}`);
  }

  return nextDate;
}
