import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard, PermissionsGuard, Permissions, Public } from '@verichron/auth';
import { ErrorResponseDto } from '../core/dto';
import { OnboardingService } from './onboarding.service';
import { PlatformPermission } from '@verichron/enums';
import {
  ProvisionOrganizationDto,
  OnboardingResponseDto,
  OnboardingStatusResponseDto,
  ActivateOrganizationDto,
} from './dto';

/**
 * Onboarding controller handles new organization provisioning workflow
 * Routes: /onboarding
 *
 * Note: These endpoints require platform-level admin permissions.
 * TODO: Implement platform-level authorization guard once available.
 */

@ApiTags('Onboarding')
@ApiBearerAuth()
@Controller('organizations/onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PlatformPermission.ORGS_CREATE)
  @ApiOperation({
    summary: 'Provision new organization',
    description:
      'Provision a new organization with initial admin user (platform admin only). Orchestrates creation across multiple services.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Organization provisioned successfully',
    type: OnboardingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Organization already exists',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Platform admin role required',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async provisionOrganization(
    @Body() provisionOrganizationDto: ProvisionOrganizationDto,
    @Req() request: Request,
  ): Promise<OnboardingResponseDto> {
    const userId = (request as any).user?.sub;

    this.logger.log('Onboarding request received', {
      organizationName: provisionOrganizationDto.organization.name,
      organizationType: provisionOrganizationDto.organization.organizationType,
      adminEmail: provisionOrganizationDto.initialAdmin.email,
      initiatedBy: userId,
    });

    const result = await this.onboardingService.provisionOrganization({
      ...provisionOrganizationDto,
      createdBy: userId,
    });

    this.logger.log('Onboarding completed successfully', {
      organizationId: result.orgId,
      organizationName: result.orgName,
    });

    return result;
  }

  @Get(':organizationId/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get onboarding status',
    description: 'Check the onboarding status for an organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding status retrieved successfully',
    type: OnboardingStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async getOnboardingStatus(
    @Param('organizationId') organizationId: string,
  ): Promise<OnboardingStatusResponseDto> {
    this.logger.log(`Retrieving onboarding status for organization: ${organizationId}`);

    const result = await this.onboardingService.getOnboardingStatus(organizationId);

    return result;
  }
}
