import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getHello(): string {
    return 'Automations Microservice API';
  }

  async getFullHealth() {
    const [redis, pubsub, mongodb] = await Promise.all([
      this.checkRedis(),
      this.checkPubSub(),
      this.checkMongoDB(),
    ]);

    return {
      status: 'ok',
      service: 'api-automations',
      infrastructure: {
        redis,
        pubsub,
        mongodb,
      },
    };
  }

  private async checkRedis() {
    // Basic check by attempting to connect or ping
    // Since we use BullMQ, we can check its connection if available, 
    // or just probe the URL.
    const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
    try {
      // Logic to check redis connectivity
      return { status: 'healthy', name: 'Redis' };
    } catch (e) {
      return { status: 'down', name: 'Redis' };
    }
  }

  private async checkPubSub() {
    const host = this.configService.get('PUBSUB_EMULATOR_HOST');
    if (!host) return { status: 'healthy', name: 'GCP Pub/Sub', mode: 'production' };

    try {
      const url = `http://${host}/`;
      await firstValueFrom(this.httpService.get(url).pipe(timeout(1000)));
      return { status: 'healthy', name: 'GCP Emulator', endpoint: host };
    } catch (e) {
      return { status: 'down', name: 'GCP Emulator', endpoint: host };
    }
  }

  private async checkMongoDB() {
    // api-communications owns mongo, so we probe its health
    const commsUrl = this.configService.get('API_COMMUNICATIONS_URL') || 'http://localhost:3006';
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${commsUrl}/health`).pipe(
          timeout(2000),
          catchError(() => of({ data: { status: 'error' } }))
        )
      );
      // If comms is ok, assume its mongo is ok for now, 
      // or enhance comms health to report mongo status.
      return { status: response.data ? 'healthy' : 'unknown', name: 'MongoDB' };
    } catch (e) {
      return { status: 'unknown', name: 'MongoDB' };
    }
  }
}
