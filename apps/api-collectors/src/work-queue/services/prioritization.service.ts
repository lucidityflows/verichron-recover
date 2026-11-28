import { Injectable, Logger } from '@nestjs/common';
import { WorkQueuePriority } from '@verichron/enums';

/**
 * Prioritization Service
 *
 * Calculates priority scores and labels for work queue items.
 *
 * Scoring Algorithm:
 * - Base score from days overdue (0-40 points)
 * - Balance multiplier (0-30 points)
 * - Recent contact penalty (-20 points)
 * - Payment plan consideration (-10 points)
 * - Dispute flag (-15 points)
 * - No contact in 30+ days (+15 points)
 *
 * Priority Labels:
 * - URGENT: score >= 80
 * - HIGH: score >= 60
 * - MEDIUM: score >= 30
 * - LOW: score < 30
 *
 * This is a placeholder implementation. In Phase 2, this will be replaced
 * with LTP (Likelihood to Pay) scoring from a machine learning model.
 */
@Injectable()
export class PrioritizationService {
  private readonly logger = new Logger(PrioritizationService.name);

  /**
   * Calculate priority score and label for a debtor.
   *
   * @param params - Debtor metrics for prioritization
   * @returns Priority score (0-100) and label
   */
  calculatePriority(params: {
    totalBalance: number;
    daysOverdue: number;
    lastContactDate: Date | null;
    hasPaymentPlan: boolean;
    hasOpenDispute: boolean;
  }): { priorityScore: number; priorityLabel: WorkQueuePriority } {
    let score = 0;

    // 1. Days overdue scoring (0-40 points)
    score += this.calculateDaysOverdueScore(params.daysOverdue);

    // 2. Balance scoring (0-30 points)
    score += this.calculateBalanceScore(params.totalBalance);

    // 3. Recent contact penalty (-20 points if contacted in last 7 days)
    score += this.calculateContactRecencyScore(params.lastContactDate);

    // 4. Payment plan consideration (-10 points, lower priority)
    if (params.hasPaymentPlan) {
      score -= 10;
    }

    // 5. Dispute flag (-15 points, handle with care)
    if (params.hasOpenDispute) {
      score -= 15;
    }

    // 6. No contact bonus (+15 points if no contact in 30+ days)
    if (this.daysSinceLastContact(params.lastContactDate) >= 30) {
      score += 15;
    }

    // Clamp score to 0-100 range
    score = Math.max(0, Math.min(100, score));

    const priorityLabel = this.determinePriorityLabel(score);

    this.logger.debug('Calculated priority', {
      totalBalance: params.totalBalance,
      daysOverdue: params.daysOverdue,
      score,
      priorityLabel,
    });

    return {
      priorityScore: Math.round(score * 100) / 100, // Round to 2 decimals
      priorityLabel,
    };
  }

  /**
   * Calculate score contribution from days overdue.
   *
   * Scale:
   * - 0-30 days: 0-15 points (linear)
   * - 31-60 days: 15-25 points (linear)
   * - 61-90 days: 25-35 points (linear)
   * - 90+ days: 35-40 points (capped)
   */
  private calculateDaysOverdueScore(daysOverdue: number): number {
    if (daysOverdue <= 30) {
      return (daysOverdue / 30) * 15;
    } else if (daysOverdue <= 60) {
      return 15 + ((daysOverdue - 30) / 30) * 10;
    } else if (daysOverdue <= 90) {
      return 25 + ((daysOverdue - 60) / 30) * 10;
    } else {
      return 40;
    }
  }

  /**
   * Calculate score contribution from total balance.
   *
   * Scale:
   * - $0-$1000: 0-10 points
   * - $1001-$5000: 10-20 points
   * - $5001-$10000: 20-25 points
   * - $10000+: 25-30 points
   */
  private calculateBalanceScore(totalBalance: number): number {
    if (totalBalance <= 1000) {
      return (totalBalance / 1000) * 10;
    } else if (totalBalance <= 5000) {
      return 10 + ((totalBalance - 1000) / 4000) * 10;
    } else if (totalBalance <= 10000) {
      return 20 + ((totalBalance - 5000) / 5000) * 5;
    } else {
      return 30;
    }
  }

  /**
   * Calculate score adjustment based on contact recency.
   *
   * Recent contact means debtor is already engaged, lower priority.
   * - Contacted in last 7 days: -20 points
   * - Contacted 8-30 days ago: 0 points
   * - No contact in 30+ days: +15 points (handled in main method)
   */
  private calculateContactRecencyScore(lastContactDate: Date | null): number {
    if (!lastContactDate) {
      return 0; // No contact history, neutral
    }

    const daysSinceContact = this.daysSinceLastContact(lastContactDate);

    if (daysSinceContact < 7) {
      return -20; // Recently contacted, lower priority
    }

    return 0; // 8-30 days, neutral
  }

  /**
   * Calculate days since last contact.
   */
  private daysSinceLastContact(lastContactDate: Date | null): number {
    if (!lastContactDate) {
      return Infinity; // Never contacted
    }

    const now = new Date();
    const diffTime = now.getTime() - new Date(lastContactDate).getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine priority label from score.
   */
  private determinePriorityLabel(score: number): WorkQueuePriority {
    if (score >= 80) {
      return WorkQueuePriority.URGENT;
    } else if (score >= 60) {
      return WorkQueuePriority.HIGH;
    } else if (score >= 30) {
      return WorkQueuePriority.MEDIUM;
    } else {
      return WorkQueuePriority.LOW;
    }
  }
}
