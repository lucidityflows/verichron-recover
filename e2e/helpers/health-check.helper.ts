import * as http from 'http';
import * as net from 'net';

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  url?: string;
  error?: string;
  responseTime?: number;
}

export class UnhealthyServicesError extends Error {
  constructor(public unhealthyServices: string[], message: string) {
    super(message);
    this.name = 'UnhealthyServicesError';
  }
}

export class HealthCheckHelper {
  /**
   * Check if a TCP port is open and accepting connections
   */
  async checkTcpPort(host: string, port: number, timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let isResolved = false;

      const cleanup = () => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
        }
      };

      socket.setTimeout(timeout);
      socket.on('connect', () => {
        cleanup();
        resolve(true);
      });

      socket.on('timeout', () => {
        cleanup();
        resolve(false);
      });

      socket.on('error', () => {
        cleanup();
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Check if an HTTP endpoint returns 200
   */
  async checkHttpEndpoint(url: string, timeout = 5000): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const req = http.get(url, { timeout }, (res) => {
        const responseTime = Date.now() - startTime;

        if (res.statusCode === 200 || res.statusCode === 404) {
          // 404 is acceptable - means server is running
          resolve({ healthy: true, responseTime });
        } else {
          resolve({
            healthy: false,
            responseTime,
            error: `Unexpected status code: ${res.statusCode}`
          });
        }

        // Consume response to free up memory
        res.resume();
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          healthy: false,
          responseTime,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        resolve({
          healthy: false,
          responseTime,
          error: 'Request timeout'
        });
      });
    });
  }

  /**
   * Check PostgreSQL database
   */
  async checkPostgres(host: string, port: number): Promise<ServiceHealth> {
    const startTime = Date.now();
    const healthy = await this.checkTcpPort(host, port);
    const responseTime = Date.now() - startTime;

    return {
      name: 'PostgreSQL',
      healthy,
      url: `${host}:${port}`,
      responseTime,
      error: healthy ? undefined : 'Cannot connect to PostgreSQL',
    };
  }

  /**
   * Check Redis
   */
  async checkRedis(host: string, port: number): Promise<ServiceHealth> {
    const startTime = Date.now();
    const healthy = await this.checkTcpPort(host, port);
    const responseTime = Date.now() - startTime;

    return {
      name: 'Redis',
      healthy,
      url: `${host}:${port}`,
      responseTime,
      error: healthy ? undefined : 'Cannot connect to Redis',
    };
  }

  /**
   * Check MongoDB
   */
  async checkMongo(host: string, port: number): Promise<ServiceHealth> {
    const startTime = Date.now();
    const healthy = await this.checkTcpPort(host, port);
    const responseTime = Date.now() - startTime;

    return {
      name: 'MongoDB',
      healthy,
      url: `${host}:${port}`,
      responseTime,
      error: healthy ? undefined : 'Cannot connect to MongoDB',
    };
  }

  /**
   * Check Pub/Sub Emulator
   */
  async checkPubSubEmulator(host: string, port: number): Promise<ServiceHealth> {
    const startTime = Date.now();
    const healthy = await this.checkTcpPort(host, port);
    const responseTime = Date.now() - startTime;

    return {
      name: 'Pub/Sub Emulator',
      healthy,
      url: `${host}:${port}`,
      responseTime,
      error: healthy ? undefined : 'Cannot connect to Pub/Sub Emulator',
    };
  }

  /**
   * Check a NestJS microservice health endpoint
   */
  async checkMicroservice(name: string, url: string): Promise<ServiceHealth> {
    const result = await this.checkHttpEndpoint(url);

    return {
      name,
      healthy: result.healthy,
      url,
      responseTime: result.responseTime,
      error: result.error,
    };
  }

  /**
   * Check all infrastructure services
   */
  async checkInfrastructure(): Promise<ServiceHealth[]> {
    const checks = await Promise.all([
      this.checkPostgres('localhost', 5432),
      this.checkRedis('localhost', 6379),
      this.checkMongo('localhost', 27017),
      this.checkPubSubEmulator('localhost', 8085),
    ]);

    return checks;
  }

  /**
   * Check all microservices
   */
  async checkMicroservices(): Promise<ServiceHealth[]> {
    const checks = await Promise.all([
      this.checkMicroservice('api-users-test', 'http://localhost:3001/health'),
      this.checkMicroservice('api-organizations-test', 'http://localhost:3002/health'),
      this.checkMicroservice('api-debts-test', 'http://localhost:3003/health'),
      this.checkMicroservice('api-debtors-test', 'http://localhost:3004/health'),
      this.checkMicroservice('api-transactions-test', 'http://localhost:3005/health'),
      this.checkMicroservice('api-communications-test', 'http://localhost:3006/health'),
      this.checkMicroservice('api-collectors-test', 'http://localhost:3007/health'),
      this.checkMicroservice('api-voice-test', 'http://localhost:3008/health'),
      this.checkMicroservice('api-workflows-test', 'http://localhost:3009/health'),
      this.checkMicroservice('api-automations-test', 'http://localhost:3010/health'),

    ]);

    return checks;
  }

  /**
   * Wait for a service to become healthy
   */
  async waitForService(
    checkFn: () => Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      serviceName?: string;
    } = {}
  ): Promise<boolean> {
    const { timeout = 30000, interval = 1000, serviceName = 'service' } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const healthy = await checkFn();
      if (healthy) {
        return true;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`${serviceName} did not become healthy within ${timeout}ms`);
  }

  /**
   * Wait for all infrastructure services to be healthy
   */
  async waitForInfrastructure(timeout = 60000): Promise<void> {
    console.log('⏳ Waiting for infrastructure services...');

    const startTime = Date.now();
    const interval = 1000;
    let checks: ServiceHealth[] = [];

    while (Date.now() - startTime < timeout) {
      checks = await this.checkInfrastructure();
      const allHealthy = checks.every(check => check.healthy);

      if (allHealthy) {
        console.log('✅ All infrastructure services are healthy');
        return;
      }

      const unhealthyServices = checks.filter(c => !c.healthy).map(c => c.name);
      console.log(`⏳ Waiting for: ${unhealthyServices.join(', ')}`);

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    const unhealthyServices = checks.filter(c => !c.healthy).map(c => c.name);
    throw new UnhealthyServicesError(
      unhealthyServices,
      'Infrastructure services did not become healthy in time',
    );
  }

  async waitForServices(serviceNames: string[], timeout = 60000): Promise<void> {
    console.log(`⏳ Waiting for services: ${serviceNames.join(', ')}...`);

    const startTime = Date.now();
    const interval = 1000;
    let allServicesHealthy = false;

    while (Date.now() - startTime < timeout && !allServicesHealthy) {
      const serviceChecks = await this.checkMicroservices();
      const targetServices = serviceChecks.filter(s => serviceNames.includes(s.name));

      allServicesHealthy = targetServices.every(s => s.healthy);

      if (allServicesHealthy) {
        console.log(`✅ Services are healthy: ${serviceNames.join(', ')}`);
        return;
      }

      const unhealthy = targetServices.filter(s => !s.healthy).map(s => s.name);
      const healthy = targetServices.filter(s => s.healthy).map(s => s.name);
      console.log(`⏳ Still waiting for ${unhealthy.length} service(s): ${unhealthy.join(', ')} (${healthy.length} healthy: ${healthy.join(', ')})...`);

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    if (!allServicesHealthy) {
      const serviceChecks = await this.checkMicroservices();
      const unhealthy = serviceChecks
        .filter(s => serviceNames.includes(s.name) && !s.healthy)
        .map(s => s.name);

      throw new UnhealthyServicesError(
        unhealthy,
        `Services did not become healthy in time: ${unhealthy.join(', ')}`
      );
    }
  }

  /**
   * Print health status in a nice format
   */
  printHealthStatus(services: ServiceHealth[]): void {
    console.log('\n📊 Service Health Status:');
    console.log('═'.repeat(60));

    for (const service of services) {
      const status = service.healthy ? '✅' : '❌';
      const time = service.responseTime ? `${service.responseTime}ms` : 'N/A';

      console.log(`${status} ${service.name.padEnd(25)} ${time.padStart(8)}`);

      if (service.url) {
        console.log(`   URL: ${service.url}`);
      }

      if (service.error) {
        console.log(`   Error: ${service.error}`);
      }
    }

    console.log('═'.repeat(60));

    const healthyCount = services.filter(s => s.healthy).length;
    console.log(`\n${healthyCount}/${services.length} services healthy\n`);
  }
}

/**
 * Create a health check helper instance
 */
export function createHealthCheckHelper(): HealthCheckHelper {
  return new HealthCheckHelper();
}
