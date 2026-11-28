import { Injectable, Logger } from '@nestjs/common';
import { GatewaysService } from './gateways/gateway.service';

/**
 * Transactions Ops Service
 *
 * Exclusively for Platform Admins (ui-ops).
 * Handles global transaction oversight and gateway health.
 */
@Injectable()
export class TransactionsOpsService {
  private readonly logger = new Logger(TransactionsOpsService.name);

  constructor(private readonly gatewaysService: GatewaysService) {}

  /**
   * Get consolidated health status for all enabled payment gateways
   */
  async getGatewayStatus() {
    return this.gatewaysService.getGatewayStatus();
  }
}
