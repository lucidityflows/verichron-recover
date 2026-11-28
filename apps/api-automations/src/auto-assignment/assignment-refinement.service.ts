import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HmacSigner, INTERNAL_AUTH_HEADERS } from '@verichron/security';
import * as crypto from 'crypto';

@Injectable()
export class AssignmentRefinementService {
  private readonly logger = new Logger(AssignmentRefinementService.name);
  private readonly serviceName = 'api-automations';
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceKey = this.configService.get<string>('SERVICE_KEY_AUTOMATIONS') || '';
  }

  /**
   * Check if a debtor has a sticky (primary) collector assigned.
   * Relationship Tier: api-collectors (Redis) / api-debtors (DB)
   */
  async getStickyCollector(debtorId: string): Promise<string | null> {
    const collectorsUrl = this.configService.get<string>('API_COLLECTORS_URL');
    if (!collectorsUrl) return null;

    try {
      const response = await this.fetchInternal(
        collectorsUrl,
        `/internal/collectors/sticky-assignment/${debtorId}`
      );
      return response.collectorId || null;
    } catch (error) {
      this.logger.error(`Failed to fetch sticky collector for debtor ${debtorId}`, error);
      return null;
    }
  }

  /**
   * Get all teams authorized to work on a specific portfolio.
   * Strategic Tier: api-organizations (Portfolio-Team Bridge)
   */
  async getAuthorizedTeamsForPortfolio(organizationId: string, portfolioId: string): Promise<string[]> {
    const orgsUrl = this.configService.get<string>('API_ORGANIZATIONS_URL');
    if (!orgsUrl) return [];

    try {
      // Endpoint created in api-organizations TeamsController
      const response = await this.fetchInternal(
        orgsUrl,
        `/organizations/${organizationId}/teams/portfolios/${portfolioId}`
      );
      
      // Response is TeamResponseDto[], we need the IDs
      return response.map((team: any) => team.id);
    } catch (error) {
      this.logger.error(`Failed to fetch authorized teams for portfolio ${portfolioId}`, error);
      return [];
    }
  }

  /**
   * Get all collector IDs belonging to a set of teams.
   * This allows us to expand authorized teams into a pool of collectors.
   */
  async getCollectorsForTeams(organizationId: string, teamIds: string[]): Promise<string[]> {
    const orgsUrl = this.configService.get<string>('API_ORGANIZATIONS_URL');
    if (!orgsUrl || teamIds.length === 0) return [];

    try {
      const collectorIds: string[] = [];
      
      // Fetch members for each team in parallel
      await Promise.all(teamIds.map(async (teamId) => {
        const members = await this.fetchInternal(
          orgsUrl,
          `/internal/teams/${organizationId}/${teamId}/members`
        );
        collectorIds.push(...members.map((m: any) => m.userId));
      }));

      return [...new Set(collectorIds)]; // Unique IDs
    } catch (error) {
      this.logger.error(`Failed to fetch collectors for teams ${teamIds.join(',')}`, error);
      return [];
    }
  }

  /**
   * Authenticated internal fetch helper
   */
  private async fetchInternal(baseUrl: string, path: string): Promise<any> {
    const timestamp = Date.now();
    const nonce = crypto.randomUUID();
    const method = 'GET';
    const body = '';

    const signature = HmacSigner.sign(
      method,
      path,
      body,
      this.serviceKey,
      timestamp,
      nonce,
    );

    const response = await firstValueFrom(
      this.httpService.get(`${baseUrl}${path}`, {
        headers: {
          [INTERNAL_AUTH_HEADERS.SERVICE_NAME]: this.serviceName,
          [INTERNAL_AUTH_HEADERS.TIMESTAMP]: timestamp.toString(),
          [INTERNAL_AUTH_HEADERS.NONCE]: nonce,
          [INTERNAL_AUTH_HEADERS.SIGNATURE]: signature,
        },
      })
    );
    return response.data;
  }
}
