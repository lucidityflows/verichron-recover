import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  /**
   * Check if a debtor is on the Do Not Call (DNC) list.
   * 
   * @param debtorId - The ID of the debtor to check
   * @param organizationId - The organization context
   * @returns True if the debtor is on the DNC list
   */
  async isDnc(debtorId: string, organizationId: string): Promise<boolean> {
    this.logger.log(`Checking DNC status for debtor ${debtorId} in organization ${organizationId}`);
    // Mock implementation for now - always returns false
    return false;
  }

  /**
   * Alias for isDnc with legacy argument order (org first).
   * @deprecated Use isDnc(debtorId, organizationId) instead.
   */
  async checkDncStatus(organizationId: string, debtorId: string): Promise<boolean> {
    return this.isDnc(debtorId, organizationId);
  }
}