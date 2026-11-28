import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Teams Client Service
 *
 * Makes internal HTTP calls to api-organizations to query team information.
 * Used by TeamAccessGuard to validate team membership.
 */
@Injectable()
export class TeamsClientService {
  private readonly logger = new Logger(TeamsClientService.name);
  private readonly apiOrganizationsUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiOrganizationsUrl =
      this.configService.get<string>('API_ORGANIZATIONS_URL') ||
      'http://api-organizations:3002';
  }

  /**
   * Verify if a team belongs to an organization
   */
  async verifyTeamBelongsToOrg(
    teamId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      const url = `${this.apiOrganizationsUrl}/internal/organizations/teams/verify-team-org/${organizationId}/${teamId}`;
      this.logger.debug(`Verifying team ${teamId} belongs to org ${organizationId}`);

      const response = await firstValueFrom(
        this.httpService.get<{ belongs: boolean }>(url),
      );

      return response.data.belongs;
    } catch (error) {
      this.logger.error(
        `Failed to verify team ${teamId} for org ${organizationId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Verify if a user is a member of a team
   */
  async verifyUserIsTeamMember(
    userId: string,
    teamId: string,
  ): Promise<boolean> {
    try {
      const url = `${this.apiOrganizationsUrl}/internal/organizations/teams/verify-membership/${userId}/${teamId}`;
      this.logger.debug(`Verifying user ${userId} is member of team ${teamId}`);

      const response = await firstValueFrom(
        this.httpService.get<{ isMember: boolean }>(url),
      );

      return response.data.isMember;
    } catch (error) {
      this.logger.error(
        `Failed to verify membership for user ${userId} in team ${teamId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Get a user's primary team ID
   */
  async getUserPrimaryTeamId(
    userId: string,
    organizationId: string,
  ): Promise<string | null> {
    try {
      const url = `${this.apiOrganizationsUrl}/internal/organizations/teams/user-primary-team/${organizationId}/${userId}`;
      this.logger.debug(
        `Getting primary team for user ${userId} in org ${organizationId}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<{ primaryTeamId: string | null }>(url),
      );

      return response.data.primaryTeamId;
    } catch (error) {
      this.logger.error(
        `Failed to get primary team for user ${userId} in org ${organizationId}`,
        error,
      );
      return null;
    }
  }

  /**
   * Get all teams for a user in an organization
   */
  async getUserTeams(
    userId: string,
    organizationId: string,
  ): Promise<string[]> {
    try {
      const url = `${this.apiOrganizationsUrl}/internal/organizations/teams/${organizationId}/user/${userId}`;
      this.logger.debug(
        `Getting teams for user ${userId} in org ${organizationId}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<Array<{ id: string }>>(url),
      );

      return response.data.map((team) => team.id);
    } catch (error) {
      this.logger.error(
        `Failed to get teams for user ${userId} in org ${organizationId}`,
        error,
      );
      return [];
    }
  }

  /**
   * Get all members of a team
   */
  async getTeamMembers(
    organizationId: string,
    teamId: string,
  ): Promise<Array<{ userId: string; role: string }>> {
    try {
      const url = `${this.apiOrganizationsUrl}/internal/organizations/teams/${organizationId}/${teamId}/members`;
      this.logger.debug(
        `Getting members for team ${teamId} in org ${organizationId}`,
      );

      const response = await firstValueFrom(
        this.httpService.get<Array<{ userId: string; role: string }>>(url),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get members for team ${teamId} in org ${organizationId}`,
        error,
      );
      return [];
    }
  }
}
