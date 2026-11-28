import { Injectable, Logger } from '@nestjs/common';

/**
 * CircuitBreakerService
 *
 * Implements circuit breaker pattern for internal service calls.
 * Prevents cascading failures when downstream services are slow/down.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail immediately
 * - HALF_OPEN: Testing if service recovered
 */

interface CircuitBreakerConfig {
  timeout: number; // Fail fast after X ms
  errorThresholdPercentage: number; // Open circuit after X% errors
  resetTimeout: number; // Retry after X ms
  volumeThreshold: number; // Need X requests to calculate %
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitStats {
  successCount: number;
  failureCount: number;
  totalCount: number;
  lastFailureTime: number | null;
  state: CircuitState;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitStats>();

  private readonly defaultConfig: CircuitBreakerConfig = {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS || '15000', 10), // 15 seconds default (handles Cloud Run cold starts)
    errorThresholdPercentage: 50, // Open after 50% errors
    resetTimeout: 30000, // Retry after 30 seconds
    volumeThreshold: 10, // Need 10 requests to calculate %
  };

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const fullConfig = { ...this.defaultConfig, ...config };
    const circuit = this.getOrCreateCircuit(serviceName);

    // Check circuit state
    if (circuit.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(circuit, fullConfig.resetTimeout)) {
        this.logger.log(`Circuit HALF_OPEN for ${serviceName}, attempting reset`);
        circuit.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error(`Circuit breaker OPEN for ${serviceName}`);
      }
    }

    // Execute with timeout
    try {
      const result = await Promise.race([
        fn(),
        this.timeoutPromise(fullConfig.timeout, serviceName),
      ]);

      this.recordSuccess(serviceName);
      return result as T;
    } catch (error) {
      this.recordFailure(serviceName, fullConfig);
      throw error;
    }
  }

  /**
   * Get circuit state for a service
   */
  getState(serviceName: string): CircuitState {
    const circuit = this.circuits.get(serviceName);
    return circuit?.state || CircuitState.CLOSED;
  }

  /**
   * Get all circuit statistics
   */
  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    this.circuits.forEach((circuit, serviceName) => {
      stats[serviceName] = { ...circuit };
    });
    return stats;
  }

  /**
   * Reset circuit for a service
   */
  reset(serviceName: string): void {
    const circuit = this.circuits.get(serviceName);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.successCount = 0;
      circuit.failureCount = 0;
      circuit.totalCount = 0;
      circuit.lastFailureTime = null;
      this.logger.log(`Circuit reset for ${serviceName}`);
    }
  }

  private getOrCreateCircuit(serviceName: string): CircuitStats {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        successCount: 0,
        failureCount: 0,
        totalCount: 0,
        lastFailureTime: null,
        state: CircuitState.CLOSED,
      });
    }
    return this.circuits.get(serviceName)!;
  }

  private recordSuccess(serviceName: string): void {
    const circuit = this.getOrCreateCircuit(serviceName);
    circuit.successCount++;
    circuit.totalCount++;

    // If in HALF_OPEN and success, close the circuit
    if (circuit.state === CircuitState.HALF_OPEN) {
      this.logger.log(`Circuit CLOSED for ${serviceName} after successful request`);
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0; // Reset failure count
    }
  }

  private recordFailure(serviceName: string, config: CircuitBreakerConfig): void {
    const circuit = this.getOrCreateCircuit(serviceName);
    circuit.failureCount++;
    circuit.totalCount++;
    circuit.lastFailureTime = Date.now();

    // Check if we should open the circuit
    if (circuit.totalCount >= config.volumeThreshold) {
      const errorRate = circuit.failureCount / circuit.totalCount;
      if (errorRate * 100 >= config.errorThresholdPercentage) {
        this.logger.warn(
          `Circuit OPEN for ${serviceName} (error rate: ${(errorRate * 100).toFixed(1)}%)`,
        );
        circuit.state = CircuitState.OPEN;
      }
    }

    // If in HALF_OPEN and failure, reopen the circuit
    if (circuit.state === CircuitState.HALF_OPEN) {
      this.logger.warn(`Circuit reopened for ${serviceName} after failed test request`);
      circuit.state = CircuitState.OPEN;
    }
  }

  private shouldAttemptReset(circuit: CircuitStats, resetTimeout: number): boolean {
    if (!circuit.lastFailureTime) {
      return false;
    }
    return Date.now() - circuit.lastFailureTime >= resetTimeout;
  }

  private timeoutPromise(timeoutMs: number, serviceName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request to ${serviceName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }
}
