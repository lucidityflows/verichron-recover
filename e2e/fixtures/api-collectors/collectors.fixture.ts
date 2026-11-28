import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { WorkQueueItemStatus, WorkQueuePriority, ActionType } from '@verichron/enums';

// This interface should ideally be kept in sync with the WorkQueueItem entity
export interface WorkQueueItemData {
  id: string;
  organizationId: string;
  debtorId: string;
  debtorName: string;
  totalBalance: number;
  daysOverdue: number;
  priorityScore: number;
  priorityLabel: WorkQueuePriority;
  nextActionType: ActionType | null;
  nextActionDue: Date | null;
  lastContactDate: Date | null;
  lastContactType: ActionType | null;
  status: WorkQueueItemStatus;
  hasOpenDispute: boolean;
  hasPaymentPlan: boolean;
  tags: string[];
  assignedToUserId: string | null;
  assignedToName: string | null;
}

export class WorkQueuesFixture {
  constructor(private dataSource: DataSource) {}

  /**
   * Create a test work queue item.
   * Requires organizationId and debtorId for consistency.
   */
  async create(overrides: Partial<WorkQueueItemData> & { organizationId: string; debtorId: string }): Promise<WorkQueueItemData> {
    const priorityScore = overrides.priorityScore || faker.number.int({ min: 1, max: 100 });
    let priorityLabel: WorkQueuePriority;
    if (priorityScore > 90) priorityLabel = WorkQueuePriority.URGENT;
    else if (priorityScore > 70) priorityLabel = WorkQueuePriority.HIGH;
    else if (priorityScore > 40) priorityLabel = WorkQueuePriority.MEDIUM;
    else priorityLabel = WorkQueuePriority.LOW;

    const itemData: WorkQueueItemData = {
      id: faker.string.uuid(),
      debtorName: faker.person.fullName(),
      totalBalance: parseFloat(faker.finance.amount({ min: 50, max: 5000 })),
      daysOverdue: faker.number.int({ min: 1, max: 365 }),
      priorityScore,
      priorityLabel,
      nextActionType: ActionType.CALL,
      nextActionDue: faker.date.future({ years: 0.1 }),
      lastContactDate: faker.date.recent({ days: 30 }),
      lastContactType: ActionType.EMAIL,
      status: WorkQueueItemStatus.NEW,
      hasOpenDispute: false,
      hasPaymentPlan: false,
      tags: [],
      assignedToUserId: null,
      assignedToName: null,
      ...overrides,
    };

    await this.dataSource.query(
      `INSERT INTO work_queue_items (id, organization_id, debtor_id, debtor_name, total_balance, days_overdue, priority_score, priority_label, next_action_type, next_action_due, last_contact_date, last_contact_type, status, has_open_dispute, has_payment_plan, tags, assigned_to_user_id, assigned_to_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())`,
      [
        itemData.id,
        itemData.organizationId,
        itemData.debtorId,
        itemData.debtorName,
        itemData.totalBalance,
        itemData.daysOverdue,
        itemData.priorityScore,
        itemData.priorityLabel,
        itemData.nextActionType,
        itemData.nextActionDue,
        itemData.lastContactDate,
        itemData.lastContactType,
        itemData.status,
        itemData.hasOpenDispute,
        itemData.hasPaymentPlan,
        itemData.tags,
        itemData.assignedToUserId,
        itemData.assignedToName,
      ]
    );

    return itemData;
  }

  /**
   * Create multiple work queue items for a given organization.
   */
  async createMany(
    count: number,
    defaults: { organizationId: string } & Partial<WorkQueueItemData>
  ): Promise<WorkQueueItemData[]> {
    const promises = Array.from({ length: count }, () => {
      // Create unique debtorId for each item
      const debtorId = faker.string.uuid();
      return this.create({ ...defaults, debtorId });
    });
    return Promise.all(promises);
  }

  /**
   * Clean all work queue items.
   */
  async clean(): Promise<void> {
    await this.dataSource.query('TRUNCATE TABLE work_queue_items CASCADE');
  }
}

/**
 * Factory function to create a collectors fixture.
 */
export function createCollectorsFixture(dataSource: DataSource): WorkQueuesFixture {
  return new WorkQueuesFixture(dataSource);
}
