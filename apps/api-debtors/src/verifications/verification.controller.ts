import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto';
import { QueryVerificationRequestsDto } from './dto/query-verification-requests.dto';
import { PaginatedVerificationRequestsDto } from './dto/paginated-verification-requests.dto';
import { VerificationStatisticsDto } from './dto/verification-statistics.dto';
import { VerificationRequest } from './entities/verification.entity';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

/**
 * Verification Controller
 * 
 * Manages verification requests for debtor data validation.
 */
@ApiTags('Debtor Verifications')
@ApiBearerAuth()
@Controller('debtors/verifications/orgs/:organizationId/debtors/:debtorId')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.VERIFICATIONS_READ)
  @ApiOperation({
    summary: 'List verification requests for a debtor',
    description:
      'Retrieve a paginated list of verification requests with optional filtering by type and status.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification requests retrieved successfully',
    type: PaginatedVerificationRequestsDto,
  })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Query() query: QueryVerificationRequestsDto,
  ) {
    return this.verificationService.findAll(debtorId, query);
  }

  @Get('statistics')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.VERIFICATIONS_READ)
  @ApiOperation({
    summary: 'Get verification statistics for a debtor',
    description:
      'Retrieve aggregated statistics about verification requests (counts by status and type).',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: VerificationStatisticsDto,
  })
  async getStatistics(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
  ) {
    return this.verificationService.getStatistics(debtorId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.VERIFICATIONS_READ)
  @ApiOperation({
    summary: 'Get verification request details',
    description:
      'Retrieve detailed information about a specific verification request including results.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Verification request UUID',
    example: '123e4567-e89b-12d3-a456-426614174007',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification request retrieved successfully',
    type: VerificationRequest,
  })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VerificationRequest> {
    return this.verificationService.findOne(id, debtorId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.VERIFICATIONS_WRITE)
  @ApiOperation({
    summary: 'Request a new verification',
    description:
      'Create a new verification request. Processing happens asynchronously.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Verification request created and queued for processing',
    type: VerificationRequest,
  })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Body() createDto: CreateVerificationRequestDto,
  ): Promise<VerificationRequest> {
    return this.verificationService.requestVerification(
      debtorId,
      createDto,
    );
  }

  @Post(':id/retry')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.VERIFICATIONS_WRITE)
  @ApiOperation({
    summary: 'Retry a failed verification',
    description:
      'Retry a verification that previously failed or encountered an error.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Verification request UUID',
    example: '123e4567-e89b-12d3-a456-426614174007',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification retry initiated',
    type: VerificationRequest,
  })
  async retry(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VerificationRequest> {
    return this.verificationService.retryVerification(
      id,
      debtorId,
    );
  }
}