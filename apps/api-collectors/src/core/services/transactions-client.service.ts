import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TransactionsClientService {
  private readonly logger = new Logger(TransactionsClientService.name);
  private readonly apiTransactionsUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiTransactionsUrl =
      this.configService.get<string>('API_TRANSACTIONS_URL') ||
      'http://api-transactions:3000';
  }

  async getPendingApprovals(organizationId: string, token: string): Promise<any[]> {
    try {
      const url = `${this.apiTransactionsUrl}/organizations/${organizationId}/transactions/settlements/pending`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: token },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch pending approvals for org ${organizationId}`, error);
      throw error;
    }
  }

  async approveSettlement(organizationId: string, offerId: string, token: string): Promise<any> {
    try {
      const url = `${this.apiTransactionsUrl}/organizations/${organizationId}/transactions/settlements/${offerId}/approve`;
      const response = await firstValueFrom(
        this.httpService.post(url, {}, {
          headers: { Authorization: token },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to approve settlement ${offerId}`, error);
      throw error;
    }
  }

  async rejectSettlement(organizationId: string, offerId: string, token: string): Promise<any> {
    try {
      const url = `${this.apiTransactionsUrl}/organizations/${organizationId}/transactions/settlements/${offerId}/reject`;
      const response = await firstValueFrom(
        this.httpService.post(url, {}, {
          headers: { Authorization: token },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to reject settlement ${offerId}`, error);
      throw error;
    }
  }
}
