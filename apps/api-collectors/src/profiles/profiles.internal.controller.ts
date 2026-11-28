import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CollectorProfileService } from './collector-profile.service';
import { AssignmentRegistryService } from '../assignments/assignment-registry.service';
import { GetCollectorsDataDto } from './dto/internal-collector-data.dto';
import {
  CollectorWorkloadResponseDto,
  CollectorSkillsResponseDto,
  CollectorTerritoriesResponseDto,
  CollectorAssignmentsResponseDto,
} from './dto/internal-collector-data.dto';
import { CollectorProfileResponseDto } from './dto/collector-profile.dto';
import { Public } from '@verichron/auth';

@ApiTags('Collector (Internal)')
@Controller('internal/collectors/profiles')
export class ProfilesInternalController {
  constructor(
    private readonly profileService: CollectorProfileService,
    private readonly registryService: AssignmentRegistryService,
  ) {}

  @Get('sticky-assignment/:debtorId')
  @Public()
  @ApiOperation({
    summary: 'Get sticky collector for a debtor (internal)',
    description: 'Internal endpoint called by api-automations to check for existing relationship ownership.',
  })
  @ApiParam({ name: 'debtorId', description: 'Debtor Profile UUID' })
  @ApiResponse({ status: 200, description: 'Collector ID or null' })
  async getStickyAssignment(@Param('debtorId') debtorId: string) {
    const collectorId = await this.registryService.getStickyCollector(debtorId);
    return { collectorId };
  }

  @Post('assignments')
  @Public()
  @ApiOperation({
    summary: 'Get active debtor IDs for collectors (internal)',
    description: 'Internal endpoint called by event-orchestrator to aggregate portfolio distribution.',
  })
  @ApiResponse({
    status: 200,
    description: 'Collector assignments retrieved successfully',
    type: CollectorAssignmentsResponseDto,
  })
  async getCollectorAssignmentsInternal(
    @Body() dto: GetCollectorsDataDto,
  ): Promise<CollectorAssignmentsResponseDto> {
    const assignments: Record<string, string[]> = {};
    
    await Promise.all(dto.collectorIds.map(async (id) => {
      assignments[id] = await this.registryService.getCollectorDebtors(id);
    }));

    return { assignments };
  }

  @Post('profiles')
  @Public()
  @ApiOperation({
    summary: 'Get full collector profiles (internal)',
    description: 'Internal endpoint called by event-orchestrator to get full profile data (availability, capacity).',
  })
  @ApiResponse({
    status: 200,
    description: 'Collector profiles retrieved successfully',
    type: [CollectorProfileResponseDto],
  })
  async getCollectorProfilesInternal(
    @Body() dto: GetCollectorsDataDto,
  ): Promise<CollectorProfileResponseDto[]> {
    return this.profileService.getCollectorProfilesByUserIds(
      dto.organizationId,
      dto.collectorIds,
    );
  }

  @Post('workload')
  @Public()
  @ApiOperation({
    summary: 'Get collector workload counts (internal)',
    description: 'Internal endpoint called by event-orchestrator to get current workload for collectors. Used for least-workload assignment strategy.',
  })
  @ApiResponse({
    status: 200,
    description: 'Workload counts retrieved successfully',
    type: CollectorWorkloadResponseDto,
  })
  async getCollectorWorkloadInternal(
    @Body() dto: GetCollectorsDataDto,
  ): Promise<CollectorWorkloadResponseDto> {
    const workload = await this.profileService.getCollectorWorkload(
      dto.organizationId,
      dto.collectorIds,
    );
    return { workload };
  }

  @Post('skills')
  @Public()
  @ApiOperation({
    summary: 'Get collector skills (internal)',
    description: 'Internal endpoint called by event-orchestrator to get skill tags for collectors. Used for skill-based assignment strategy.',
  })
  @ApiResponse({
    status: 200,
    description: 'Collector skills retrieved successfully',
    type: CollectorSkillsResponseDto,
  })
  async getCollectorSkillsInternal(
    @Body() dto: GetCollectorsDataDto,
  ): Promise<CollectorSkillsResponseDto> {
    const skills = await this.profileService.getCollectorSkills(
      dto.organizationId,
      dto.collectorIds,
    );
    return { skills };
  }

  @Post('territories')
  @Public()
  @ApiOperation({
    summary: 'Get collector territories (internal)',
    description: 'Internal endpoint called by event-orchestrator to get geographic territory assignments for collectors. Used for geographic assignment strategy.',
  })
  @ApiResponse({
    status: 200,
    description: 'Collector territories retrieved successfully',
    type: CollectorTerritoriesResponseDto,
  })
  async getCollectorTerritoriesInternal(
    @Body() dto: GetCollectorsDataDto,
  ): Promise<CollectorTerritoriesResponseDto> {
    const territories = await this.profileService.getCollectorTerritories(
      dto.organizationId,
      dto.collectorIds,
    );
    return { territories };
  }

  @Get(':organizationId')
  @Public()
  @ApiOperation({
    summary: 'Get all collector profiles for org (internal)',
    description: 'Internal endpoint called by event-orchestrator for Team Overview.',
  })
  @ApiResponse({
    status: 200,
    type: [CollectorProfileResponseDto],
  })
  async getCollectorsForOrgInternal(
    @Param('organizationId') organizationId: string,
  ): Promise<CollectorProfileResponseDto[]> {
    return this.profileService.getCollectorProfiles(organizationId, {});
  }
}
