import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import { JWT_CLAIMS_NAMESPACE, JWTPayload } from '@verichron/contracts';
import { REDIS_CLIENT } from '../core/redis';
import type Redis from 'ioredis';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token, disconnecting`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const payload = verify(token, secret) as JWTPayload;
      const claims = payload[JWT_CLAIMS_NAMESPACE];
      const organizationId = claims?.organizationId;
      const userId = payload.sub;

      if (!organizationId || !userId) {
        this.logger.warn(`Invalid token claims for client ${client.id}, disconnecting`);
        client.disconnect();
        return;
      }

      // Attach context to socket
      (client as any).user = { userId, organizationId };

      // Join organization-specific room for multi-tenant isolation
      await client.join(`org:${organizationId}`);
      
      // Join user-specific room for targeted notifications
      await client.join(`user:${userId}`);

      this.logger.log(`✅ Client ${userId} connected to org:${organizationId}`);
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    if (user) {
      this.logger.log(`❌ Client ${user.userId} disconnected`);
    }
  }

  /**
   * Broadcast an event to a specific organization
   */
  broadcastToOrg(organizationId: string, event: string, payload: any) {
    this.server.to(`org:${organizationId}`).emit(event, payload);
  }

  /**
   * Send an event to a specific user
   */
  sendToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    
    // Also check query param for flexibility
    return (client.handshake.query.token as string) || null;
  }
}
