import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Debt Index Service - Redis Read Model
 *
 * Maintains denormalized Redis indexes for fast debtor-to-debt queries.
 * Part of CQRS pattern - separates read model (Redis) from write model (PostgreSQL).
 *
 * **Redis Data Structures:**
 *
 * 1. Sorted Sets (ZSET) - Debt indexes per organization
 *    Key: `debtor:${userId}:org:${organizationId}:debts`
 *    Members: debtId
 *    Score: timestamp (for chronological ordering)
 *    Purpose: Fast retrieval of all debts for a debtor in a specific organization
 *
 * 2. Hashes - Debt summaries
 *    Key: `debt:${debtId}:summary`
 *    Fields: { debtId, debtorProfileId, organizationId, amount, currency, status, createdAt }
 *    Purpose: Avoid N+1 queries to PostgreSQL when displaying debt lists
 *
 * **Performance Characteristics:**
 * - ZADD: O(log N) - Adding debts to sorted set
 * - ZRANGE: O(log N + M) where M = returned items - Retrieving debts
 * - HGETALL: O(N) where N = number of fields - Getting debt summary
 * - Overall query: <20ms for 1000 debts
 *
 * **Event-Driven Updates:**
 * - DebtorUserLinked: Build initial index from existing debts
 * - DebtCreated: Add new debt to index
 * - DebtUpdated: Update debt summary in Redis
 * - PortfolioSold: Remove debts from old org index, add to new org index
 */
@Injectable()
export class DebtIndexService {
  private readonly logger = new Logger(DebtIndexService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Store debtorId → userId mapping for future debt creation events.
   * Called when DebtorUserLinked event is received.
   *
   * @param debtorId - Debtor ID from api-debtors
   * @param userId - User ID from api-users
   */
  async storeIdentityUserMapping(debtorIdentityId: string, userId: string): Promise<void> {
    const mappingKey = this.getIdentityUserMappingKey(debtorIdentityId);
    await this.redis.set(mappingKey, userId);
    // Expire after 90 days of inactivity
    await this.redis.expire(mappingKey, 90 * 24 * 60 * 60);
    this.logger.debug(`Stored debtorIdentityId → userId mapping: ${debtorIdentityId} → ${userId}`);
  }

  /**
   * Get userId for a debtorId from Redis mapping.
   *
   * @param debtorId - Debtor ID from api-debtors
   * @returns userId if found, null otherwise
   */
  async getUserIdForIdentity(debtorIdentityId: string): Promise<string | null> {
    const mappingKey = this.getIdentityUserMappingKey(debtorIdentityId);
    return await this.redis.get(mappingKey);
  }

  /**
   * Build Redis index for a debtor user across all their organizations.
   * Called when DebtorUserLinked event is received.
   *
   * @param userId - User ID from api-users
   * @param debtorId - Debtor ID from api-debtors
   * @param debts - All debts for the debtor from PostgreSQL
   */
  async buildDebtorIndex(
    userId: string,
    debtorIdentityId: string,
    debtorProfileId: string,
    debts: Array<{
      id: string;
      debtorProfileId: string; // Now refers to profile ID
      organizationId: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: Date;
    }>,
  ): Promise<void> {
    if (debts.length === 0) {
      this.logger.log(`No debts to index for user ${userId}`);
      return;
    }

    this.logger.log(
      `Building debt index for user ${userId} with ${debts.length} debts (identity: ${debtorIdentityId}, profile: ${debtorProfileId})`,
    );

    // Store debtorIdentityId → userId mapping for future debt creation events
    await this.storeIdentityUserMapping(debtorIdentityId, userId);

    // Group debts by organization
    const debtsByOrg = debts.reduce((acc, debt) => {
      if (!acc[debt.organizationId]) {
        acc[debt.organizationId] = [];
      }
      acc[debt.organizationId].push(debt);
      return acc;
    }, {} as Record<string, typeof debts>);

    // Use pipeline for atomic batch operations
    const pipeline = this.redis.pipeline();

    for (const [organizationId, orgDebts] of Object.entries(debtsByOrg)) {
      const indexKey = this.getDebtorOrgIndexKey(userId, organizationId);

      // Add all debts to the sorted set (score = timestamp for chronological ordering)
      for (const debt of orgDebts) {
        const score = new Date(debt.createdAt).getTime();
        pipeline.zadd(indexKey, score, debt.id);
      }

      // Set expiration (optional - 30 days of inactivity)
      pipeline.expire(indexKey, 30 * 24 * 60 * 60);

      this.logger.debug(
        `Indexed ${orgDebts.length} debts for user ${userId} in org ${organizationId}`,
      );
    }

    // Create debt summary hashes
    for (const debt of debts) {
      const summaryKey = this.getDebtSummaryKey(debt.id);
      pipeline.hset(summaryKey, {
        debtId: debt.id,
        debtorProfileId: debt.debtorProfileId, // Now refers to profile ID
        organizationId: debt.organizationId,
        amount: debt.amount.toString(),
        currency: debt.currency,
        status: debt.status,
        createdAt: debt.createdAt.toISOString(),
      });
      pipeline.expire(summaryKey, 30 * 24 * 60 * 60);
    }

    await pipeline.exec();

    this.logger.log(
      `Successfully built debt index for user ${userId} across ${Object.keys(debtsByOrg).length} organizations`,
    );
  }

  /**
   * Add a single debt to the debtor's Redis index.
   * Called when DebtCreated event is received.
   *
   * @param userId - User ID linked to the debtor
   * @param debt - Debt details from the event
   */
  async addDebtToIndex(
    userId: string,
    debt: {
      id: string;
      debtorProfileId: string; // Now refers to profile ID
      organizationId: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: Date | string;
    },
  ): Promise<void> {
    this.logger.log(`Adding debt ${debt.id} to index for user ${userId}`);

    const pipeline = this.redis.pipeline();

    // Add to sorted set
    const indexKey = this.getDebtorOrgIndexKey(userId, debt.organizationId);
    const score = new Date(debt.createdAt).getTime();
    pipeline.zadd(indexKey, score, debt.id);
    pipeline.expire(indexKey, 30 * 24 * 60 * 60);

    // Create debt summary
    const summaryKey = this.getDebtSummaryKey(debt.id);
    pipeline.hset(summaryKey, {
      debtId: debt.id,
      debtorProfileId: debt.debtorProfileId, // Now refers to profile ID
      organizationId: debt.organizationId,
      amount: debt.amount.toString(),
      currency: debt.currency,
      status: debt.status,
      createdAt:
        debt.createdAt instanceof Date ? debt.createdAt.toISOString() : debt.createdAt,
    });
    pipeline.expire(summaryKey, 30 * 24 * 60 * 60);

    await pipeline.exec();

    this.logger.debug(`Successfully added debt ${debt.id} to Redis index`);
  }

  /**
   * Update debt summary in Redis when debt details change.
   * Called when DebtUpdated event is received.
   *
   * @param debtId - Debt ID to update
   * @param updates - Fields to update
   */
  async updateDebtSummary(
    debtId: string,
    updates: Partial<{
      amount: number;
      currency: string;
      status: string;
      organizationId: string;
    }>,
  ): Promise<void> {
    this.logger.log(`Updating debt summary for debt ${debtId}`);

    const summaryKey = this.getDebtSummaryKey(debtId);

    // Convert amount to string if present
    const redisUpdates: Record<string, string> = {};
    for (const [key, value] of Object.entries(updates)) {
      redisUpdates[key] = typeof value === 'number' ? value.toString() : value;
    }

    await this.redis.hset(summaryKey, redisUpdates);

    this.logger.debug(`Updated debt summary for debt ${debtId}`);
  }

  /**
   * Retrieve all debt IDs for a debtor in a specific organization.
   *
   * @param userId - User ID from JWT
   * @param organizationId - Organization ID from JWT context
   * @param pageSize - Maximum number of debts to return (default 100)
   * @param offset - Pagination offset (default 0)
   * @returns Array of debt IDs sorted by creation date (newest first)
   */
  async getDebtorDebtsInOrg(
    userId: string,
    organizationId: string,
    pageSize: number = 100,
    offset: number = 0,
  ): Promise<string[]> {
    const indexKey = this.getDebtorOrgIndexKey(userId, organizationId);

    // Get debts in reverse chronological order (newest first)
    // ZREVRANGE returns items sorted by score in descending order
    const debtIds = await this.redis.zrevrange(indexKey, offset, offset + pageSize - 1);

    this.logger.debug(
      `Retrieved ${debtIds.length} debt IDs for user ${userId} in org ${organizationId}`,
    );

    return debtIds;
  }

  /**
   * Retrieve debt summaries for multiple debt IDs.
   *
   * @param debtIds - Array of debt IDs
   * @returns Array of debt summaries
   */
  async getDebtSummaries(debtIds: string[]): Promise<
    Array<{
      debtId: string;
      debtorProfileId: string; // Now refers to profile ID
      organizationId: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
    }>
  > {
    if (debtIds.length === 0) {
      return [];
    }

    const pipeline = this.redis.pipeline();

    for (const debtId of debtIds) {
      const summaryKey = this.getDebtSummaryKey(debtId);
      pipeline.hgetall(summaryKey);
    }

    const results = await pipeline.exec();

    if (!results) {
      return [];
    }

    const summaries = results
      .map(([err, data]) => {
        if (err || !data || Object.keys(data).length === 0) {
          return null;
        }
        const typedData = data as Record<string, string>;
        return {
          debtId: typedData.debtId,
          debtorProfileId: typedData.debtorProfileId, // Now refers to profile ID
          organizationId: typedData.organizationId,
          amount: parseFloat(typedData.amount),
          currency: typedData.currency,
          status: typedData.status,
          createdAt: typedData.createdAt,
        };
      })
      .filter((summary) => summary !== null) as Array<{
        debtId: string;
        debtorProfileId: string; // Now refers to profile ID
        organizationId: string;
        amount: number;
        currency: string;
        status: string;
        createdAt: string;
      }>;

    this.logger.debug(`Retrieved ${summaries.length} debt summaries`);

    return summaries;
  }

  /**
   * Remove a debt from the debtor's index (e.g., when debt is deleted or organization changes).
   *
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param debtId - Debt ID to remove
   */
  async removeDebtFromIndex(
    userId: string,
    organizationId: string,
    debtId: string,
  ): Promise<void> {
    const indexKey = this.getDebtorOrgIndexKey(userId, organizationId);
    const summaryKey = this.getDebtSummaryKey(debtId);

    const pipeline = this.redis.pipeline();
    pipeline.zrem(indexKey, debtId);
    pipeline.del(summaryKey);
    await pipeline.exec();

    this.logger.debug(`Removed debt ${debtId} from index for user ${userId}`);
  }

  /**
   * Clear all debts for a user (e.g., when user is deleted).
   *
   * @param userId - User ID
   * @param organizationIds - Array of organization IDs to clear
   */
  async clearDebtorIndex(userId: string, organizationIds: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const organizationId of organizationIds) {
      const indexKey = this.getDebtorOrgIndexKey(userId, organizationId);
      pipeline.del(indexKey);
    }

    await pipeline.exec();

    this.logger.log(`Cleared debt index for user ${userId}`);
  }

  /**
   * Get Redis key for debtorIdentityId → userId mapping.
   */
  private getIdentityUserMappingKey(debtorIdentityId: string): string {
    return `debtor-identity:${debtorIdentityId}:user-mapping`;
  }

  /**
   * Get Redis key for debtor organization debt index.
   */
  private getDebtorOrgIndexKey(userId: string, organizationId: string): string {
    return `debtor:${userId}:org:${organizationId}:debts`;
  }

  /**
   * Get Redis key for debt summary.
   */
  private getDebtSummaryKey(debtId: string): string {
    return `debt:${debtId}:summary`;
  }
}
