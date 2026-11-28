import { Logger } from '@nestjs/common';
import { type EventEnvelope } from '@verichron/events';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';

/**
 * Abstract Base Listener
 *
 * Standardizes event consumption across all microservices.
 * Enforces mandatory DTO validation, consistent logging, and error handling.
 *
 * DESIGN GOALS:
 * 1. Zero-Boilerplate: Logger is initialized automatically.
 * 2. Mandatory Validation: Every event must have a DTO class (via @EventSubscription metadata).
 * 3. Interception Pattern: Discovery service routes through this class to ensure
 *    standardization without requiring manual delegation or creating "dead code".
 * 4. Metadata-Driven: DTO class is stored in @EventSubscription decorator metadata,
 *    eliminating instance lifecycle dependencies.
 *
 * @template T The type of the event payload (DTO)
 */
export abstract class AbstractBaseListener<T extends object> {
  /**
   * Private backing field for lazy logger initialization.
   * Do not access directly - use the logger getter.
   */
  private _logger?: Logger;

  /**
   * Logger instance, lazily initialized with the implementing class name.
   *
   * Uses getter pattern to avoid field initialization order issues with
   * TypeScript's useDefineForClassFields: true (ES2022 standard).
   *
   * With ES2022 field semantics, child class field initializers run AFTER
   * the parent constructor but can interfere with parent-initialized fields.
   * The getter ensures logger is available on first access, regardless of
   * initialization timing.
   */
  protected get logger(): Logger {
    if (!this._logger) {
      this._logger = new Logger(this.constructor.name);
    }
    return this._logger;
  }

  /**
   * Initialize the base listener.
   * No parameters needed - DTO class is retrieved from decorator metadata.
   * Logger is lazily initialized via getter on first access.
   */
  constructor() {
    // Logger initialization moved to getter for ES2022 field compatibility
  }

  /**
   * Standardized flow executor.
   * This is called automatically by the SubscriberDiscoveryService for
   * classes extending AbstractBaseListener.
   *
   * @param envelope - The event envelope containing event data and metadata
   * @param methodName - Name of the handler method to invoke
   * @param dtoClass - DTO class for validation (from @EventSubscription metadata)
   * @internal Used by SubscriberDiscoveryService
   */
  async __executeStandardizedFlow(
    envelope: EventEnvelope<T>,
    methodName: string,
    dtoClass: new () => T
  ): Promise<void> {
    const startTime = Date.now();
    const { eventId, eventType, correlationId } = envelope;

    try {
      const logger = this.getSafeLogger();
      logger.log(
        `📨 Receiving event ${eventType} (ID: ${eventId}, CID: ${correlationId ?? 'none'})`
      );

      // 1. Mandatory transformation using DTO class from decorator metadata
      const data = plainToInstance(dtoClass, envelope.data);
      
      // 2. Mandatory validation
      const errors = await validate(data);
      if (errors.length > 0) {
        this.handleValidationError(errors, envelope);
        return; // Acknowledge and drop malformed data
      }

      // 3. Execute the implementing method
      type ListenerMethod = (data: T, envelope: EventEnvelope<T>) => Promise<void>;
      await (this[methodName as keyof this] as unknown as ListenerMethod).call(this, data, envelope);
      
      const duration = Date.now() - startTime;
      logger.log(`✅ Successfully processed ${eventType} (${duration}ms)`);

      // 4. Optional metrics hook
      this.onMetrics?.(eventType, duration);
     
    } catch (error: any) {
       
      this.handleProcessingError(error, envelope);
      // Re-throw to trigger Pub/Sub Nack (retry)
      throw error;
    }
  }

  /**
   * Provides a safe logger reference.
   * Now simply delegates to the logger getter which handles lazy initialization.
   */
  private getSafeLogger(): Logger {
    return this.logger;
  }

  /**
   * Optional hook for performance and observability metrics.
   */
  protected onMetrics?(eventType: string, duration: number): void;

  /**
   * Standardized validation error handling.
   */
  protected handleValidationError(errors: ValidationError[], envelope: EventEnvelope<T>): void {
    const logger = this.getSafeLogger();
    logger.error(
      `❌ Validation failed for event ${envelope.eventType} (${envelope.eventId}). ` +
      `Errors: ${JSON.stringify(errors)}`
    );
  }

  /**
   * Standardized processing error handling.
   */
  protected handleProcessingError(error: Error, envelope: EventEnvelope<T>): void {
    const logger = this.getSafeLogger();
    logger.error(
      `❌ Failed to process ${envelope.eventType}: ${error.message}`,
      error.stack
    );
  }
}
