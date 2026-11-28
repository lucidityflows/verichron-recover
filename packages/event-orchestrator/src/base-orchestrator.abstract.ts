import { type Logger } from '@nestjs/common';
import { type HttpService } from '@nestjs/axios';
import { type EventPublisher } from '@verichron/event-publisher';
import { type EventOrchestratorConfig } from './event-orchestrator.module';
import { type OrchestrationEventEnvelope, type EventType, EVENT_SOURCES } from '@verichron/events';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HmacSigner, INTERNAL_AUTH_HEADERS } from '@verichron/security';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

/**
 * Base Orchestrator
 *
 * Provides a standardized framework for implementing Request-Response event orchestrators.
 * Centralizes common logic for:
 * 1. Request Payload Validation
 * 2. Error Handling & Failure Responses
 * 3. Response Validation & Publishing
 * 4. Secure Internal HTTP Calls (HMAC)
 *
 * @template TReq The request DTO class
 * @template TRes The response DTO class
 */
export abstract class BaseOrchestrator<TReq extends object, TRes extends object> {
  protected abstract readonly logger: Logger;
  protected abstract readonly requestDtoClass: new () => TReq;
  protected abstract readonly responseDtoClass: new () => TRes;

  /**
   * The name of this service (e.g. 'api-organizations').
   * Used for identifying the caller in HMAC signatures.
   */
  protected abstract readonly serviceName: string;

  /**
   * The environment variable name holding the service's private key.
   * e.g. 'SERVICE_KEY_ORGANIZATIONS'
   */
  protected abstract readonly serviceKeyEnvVar: string;

  private _serviceKey: string | undefined;

  protected constructor(
    protected readonly config: EventOrchestratorConfig,
    protected readonly httpService: HttpService,
    protected readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Lazy-loads the service key from environment variables.
   */
  protected get serviceKey(): string {
    if (this._serviceKey) return this._serviceKey;
    this._serviceKey = process.env[this.serviceKeyEnvVar] || '';
    if (!this._serviceKey) {
      this.logger.error(
        `${this.serviceKeyEnvVar} is not configured. Internal API calls will fail with HMAC authentication.`,
      );
    }
    return this._serviceKey;
  }

  /**
   * Executes the standardized orchestration flow.
   *
   * 1. Validates the incoming request payload.
   * 2. Executes the business logic (handler).
   * 3. Validates and publishes the success response.
   * 4. Catches errors, creates a failure response, and publishes it.
   *
   * @param envelope The incoming event envelope
   * @param responseEventType The event type for the response (e.g. COMPLETED)
   * @param handler The business logic function returning the plain response object
   */
  protected async executeOrchestration(
    envelope: OrchestrationEventEnvelope<any>,
    responseEventType: EventType,
    handler: (requestPayload: TReq) => Promise<TRes | Partial<TRes>>,
  ): Promise<void> {
    const { data, replyTo, correlationId, eventId } = envelope;

    // 1. Validate Request
    const requestPayload = plainToInstance(this.requestDtoClass, data);
    const requestErrors = await validate(requestPayload);

    if (requestErrors.length > 0) {
      this.logger.error(
        `❌ Invalid request payload for ${this.requestDtoClass.name} (EventID: ${eventId}). Errors: ${JSON.stringify(
          requestErrors,
        )}`,
      );
      // If the request is invalid, we might not have enough info (like orgId) to send a useful error response.
      // However, if we have correlationId and replyTo, we should try to send a generic failure.
      if (replyTo && correlationId) {
         // Best-effort failure response using raw data if available, or just error
         await this.publishErrorResponse(
            replyTo,
            responseEventType,
            (data)?.organizationId,
            correlationId,
            `Invalid request payload: ${JSON.stringify(requestErrors)}`
         );
      }
      return;
    }

    // Context for logging
    const orgId = (requestPayload as any).organizationId;
    this.logger.log(
      `🏁 Starting orchestration for ${this.constructor.name} (Org: ${orgId}, CID: ${correlationId})`,
    );

    try {
      // 2. Execute Business Logic
      const result = await handler(requestPayload);

      // 3. Prepare & Validate Response
      // Ensure correlationId is set if missing
      if (!(result as any).correlationId && correlationId) {
        (result as any).correlationId = correlationId;
      }
      // Ensure organizationId is set if missing (usually passed through)
      if (!(result as any).organizationId && orgId) {
        (result as any).organizationId = orgId;
      }

      const responseDto = plainToInstance(this.responseDtoClass, result);
      const responseErrors = await validate(responseDto);

      if (responseErrors.length > 0) {
        this.logger.error(
          `❌ Failed to validate outgoing response ${this.responseDtoClass.name}. Errors: ${JSON.stringify(
            responseErrors,
          )}`,
        );
        throw new Error('Failed to construct valid completion response');
      }

      // 4. Publish Success
      await this.eventPublisher.publish(
        responseEventType,
        responseDto,
        this.responseDtoClass,
        {
          correlationId,
          topic: replyTo,
          eventSource: EVENT_SOURCES.EVENT_ORCHESTRATOR,
          attributes: { correlationId: correlationId || '' }
        },
      );

      this.logger.log(
        `✅ Successfully orchestrated ${this.constructor.name} (Org: ${orgId})`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `❌ Orchestration failed for ${this.constructor.name}: ${errorMessage}`,
        stack,
      );

      // 5. Publish Failure
      await this.publishErrorResponse(
        replyTo,
        responseEventType,
        orgId,
        correlationId,
        errorMessage,
      );
    }
  }

  /**
   * Helper to construct and publish an error response.
   */
  private async publishErrorResponse(
    replyTo: string,
    eventType: EventType,
    organizationId: string | undefined,
    correlationId: string | undefined,
    errorMessage: string,
  ) {
    if (!replyTo) {
        this.logger.warn('Cannot publish error response: No replyTo topic specified.');
        return;
    }

    try {
      // Create a plain object for the error response
      // We assume the TRes DTO has 'organizationId', 'correlationId', and 'error' fields.
      const errorObj = {
        organizationId,
        correlationId,
        error: errorMessage,
      };

      const errorDto = plainToInstance(this.responseDtoClass, errorObj);

      // We validate the error DTO as well, but we're lenient if it fails (log only)
      // because we want to ensure the error gets out.
      const errors = await validate(errorDto);
      if (errors.length > 0) {
          this.logger.warn(`Generated error response failed validation: ${JSON.stringify(errors)}`);
      }

      await this.eventPublisher.publish(
        eventType,
        errorDto,
        this.responseDtoClass,
        {
          correlationId,
          topic: replyTo,
          eventSource: EVENT_SOURCES.EVENT_ORCHESTRATOR,
          attributes: { correlationId: correlationId || '' }
        },
      );
    } catch (pubError) {
      this.logger.error(
        `Failed to publish error response to ${replyTo}`,
        pubError,
      );
    }

  }

  /**
   * Performs an authenticated HTTP call to an internal microservice.
   * Handles HMAC signing automatically.
   * 
   * @param baseUrl The service base URL (e.g. 'http://api-users:3000')
   * @param path The endpoint path (e.g. '/internal/users')
   * @param method HTTP Method (GET, POST, etc.)
   * @param body Request body (optional)
   * @param queryParams Query parameters object (optional)
   */
  protected async fetchInternal<T = any>(
    baseUrl: string,
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body: any = null,
    queryParams?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    // 1. Build query string robustly using URLSearchParams
    let fullPath = path;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        // Handle cases where path might already have a '?'
        const separator = path.includes('?') ? '&' : '?';
        fullPath = `${path}${separator}${queryString}`;
      }
    }

    const url = `${baseUrl}${fullPath}`;
    
    try {
      // Generate HMAC credentials
      const timestamp = Date.now();
      const nonce = crypto.randomUUID();
      
      // 2. Build explicit Axios config based on method
      const headers: Record<string, string> = {
        [INTERNAL_AUTH_HEADERS.SERVICE_NAME]: this.serviceName,
        [INTERNAL_AUTH_HEADERS.TIMESTAMP]: timestamp.toString(),
        [INTERNAL_AUTH_HEADERS.NONCE]: nonce,
      };

      let signaturePayload = '';
      const axiosConfig: any = {
        method,
        url,
        headers,
        timeout: 30000, // Explicitly set 30s timeout to handle cold starts
      };

      // Only add body/Content-Type for POST
      if (method === 'POST') {
        headers['Content-Type'] = 'application/json';
        signaturePayload = body ? JSON.stringify(body) : '';
        axiosConfig.data = body;
      }

      // Generate signature based on the final fullPath and method-specific payload
      const signature = HmacSigner.sign(
        method,
        fullPath,
        signaturePayload,
        this.serviceKey,
        timestamp,
        nonce,
      );
      headers[INTERNAL_AUTH_HEADERS.SIGNATURE] = signature;

      this.logger.debug(`🚀 [fetchInternal] ${method} ${url}`);
      this.logger.debug(`[HMAC DEBUG] Signed Path: "${fullPath}", Signature: ${signature}`);

      const response = await firstValueFrom(
        this.httpService.request<T>(axiosConfig),
      );

      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      // Extract meaningful error message to avoid JSON parsing issues downstream
      const errorMessage = typeof errorData === 'string' 
        ? errorData 
        : (errorData?.message || error.message);

      this.logger.error(
        `❌ [fetchInternal] FAILED: ${method} ${url} | Status: ${status || 'Error'} | Error: ${errorMessage}`
      );

      throw new Error(
        `Internal service call failed (${method} ${fullPath}): ${errorMessage}`,
      );
    }
  }
}
