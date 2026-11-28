import { Controller, Post, Body, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@verichron/auth';
import { OnboardingService } from './onboarding.service';
import { ActivateOrganizationDto } from './dto';

@ApiTags('Onboarding (Internal)')
@Controller('internal/organizations/onboarding')
export class OnboardingInternalController {
  private readonly logger = new Logger(OnboardingInternalController.name);

  constructor(private readonly onboardingService: OnboardingService) {}

  // This is an internal endpoint for the orchestrator to call back to
  @Post('activate-organization')
  @Public() // Bypasses JWT guard for service-to-service communication
  @ApiOperation({ summary: 'Activate an organization (internal)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Organization activated' })
  async activateOrganization(@Body() dto: ActivateOrganizationDto) {
    this.logger.log(`Internal request to activate organization: ${dto.organizationId}`);
    await this.onboardingService.activateOrganization(
      dto.organizationId,
      dto.updatedBy,
      dto.reason,
      dto.actorEmail,
      dto.actorName
    );
    return { success: true };
  }
}
