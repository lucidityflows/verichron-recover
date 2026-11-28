import { Injectable, Logger, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../core/redis';
import type Redis from 'ioredis';

/**
 * AssignmentRegistryService
 * 
 * High-performance Redis-backed registry for tracking collector assignments.
 * Used by api-automations to make real-time decisions without hitting the main database.
 */
@Injectable()
export class AssignmentRegistryService {
  private readonly logger = new Logger(AssignmentRegistryService.name);

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  /**
   * Add a debtor assignment to a collector's active set
   */
  async addAssignment(collectorId: string, debtorId: string): Promise<void> {
    const key = `collector:${collectorId}:active_debtors`;
    await this.redis.sadd(key, debtorId);
    this.logger.debug(`Registered debtor ${debtorId} to collector ${collectorId}`);
  }

  /**
   * Remove a debtor assignment from a collector
   */
  async removeAssignment(collectorId: string, debtorId: string): Promise<void> {
    const key = `collector:${collectorId}:active_debtors`;
    await this.redis.srem(key, debtorId);
    this.logger.debug(`Unregistered debtor ${debtorId} from collector ${collectorId}`);
  }

  /**
   * Get all active debtor IDs for a collector
   */
  async getCollectorDebtors(collectorId: string): Promise<string[]> {
    const key = `collector:${collectorId}:active_debtors`;
    return this.redis.smembers(key);
  }

  /**
   * Set the sticky (primary) collector for a debtor
   */
  async setStickyCollector(debtorId: string, collectorId: string): Promise<void> {
    const key = `debtor:${debtorId}:sticky_collector`;
    // Set with 24h TTL as safety, though profile DB is source of truth
    await this.redis.set(key, collectorId, 'EX', 86400);
    this.logger.debug(`Set sticky collector ${collectorId} for debtor ${debtorId}`);
  }

  /**
   * Get the sticky collector for a debtor
   */
  async getStickyCollector(debtorId: string): Promise<string | null> {
    const key = `debtor:${debtorId}:sticky_collector`;
    return this.redis.get(key);
  }

  /**
   * Clear all assignments for a collector (e.g., when they go offline)
   */
  async clearCollector(collectorId: string): Promise<void> {
    const key = `collector:${collectorId}:active_debtors`;
    await this.redis.del(key);
    this.logger.log(`Cleared all active assignments for collector ${collectorId}`);
  }
}
