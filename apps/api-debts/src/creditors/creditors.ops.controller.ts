import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, Permissions, SkipOrgContext, CurrentUserId } from '@verichron/auth';
import { PlatformPermission } from '@verichron/enums';
import {
  CreateGlobalCreditorDto,
  UpdateGlobalCreditorDto,
  GlobalCreditorResponseDto,
} from './dto/ops';
import { CreditorsOpsService } from './creditors.ops.service';
import { CreditorResponseDto } from './dto/creditor-response.dto';
import { PaginatedCreditorResponseDto } from './dto/paginated-creditor-response.dto';

@ApiTags('Ops: Creditors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/debts/creditors')
export class CreditorsOpsController {
  constructor(private readonly opsService: CreditorsOpsService) {}

  // ==========================================================================
  // MASTER LIST (GLOBAL CREDITORS)
  // ==========================================================================

  @Get('global')
  @Permissions(PlatformPermission.ORGS_READ)
  @ApiOperation({ summary: 'List all platform master creditors (Gold List)' })
  @ApiResponse({ status: 200, type: [GlobalCreditorResponseDto] })
  async findAllGlobal(): Promise<GlobalCreditorResponseDto[]> {
    return this.opsService.findAllGlobal() as any;
  }

  @Post('global')
  @Permissions(PlatformPermission.ORGS_CREATE)
  @ApiOperation({ summary: 'Create a new master creditor' })
  @ApiResponse({ status: 201, type: GlobalCreditorResponseDto })
  async createGlobal(
    @Body() dto: CreateGlobalCreditorDto,
    @CurrentUserId() adminId: string,
  ): Promise<GlobalCreditorResponseDto> {
    return this.opsService.createGlobal(dto, adminId) as any;
  }

  @Patch('global/:id')
  @Permissions(PlatformPermission.ORGS_UPDATE)
  @ApiOperation({ summary: 'Update a master creditor record' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: GlobalCreditorResponseDto })
  async updateGlobal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGlobalCreditorDto,
    @CurrentUserId() adminId: string,
  ): Promise<GlobalCreditorResponseDto> {
    return this.opsService.updateGlobal(id, dto, adminId) as any;
  }

  @Delete('global/:id')
  @Permissions(PlatformPermission.ORGS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hard delete a master creditor record' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async removeGlobal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() adminId: string,
  ): Promise<void> {
    return this.opsService.deleteGlobal(id, adminId);
  }

  // ==========================================================================
  // TENANT LIST (READ-ONLY VISIBILITY)
  // ==========================================================================

  @Get('tenant')
  @Permissions(PlatformPermission.ORGS_READ)
  @ApiOperation({ summary: 'List all organization creditors (Read-Only)' })
  @ApiResponse({ status: 200, type: PaginatedCreditorResponseDto })
  async findAllTenant(
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<PaginatedCreditorResponseDto> {
    const response = await this.opsService.findAllTenantCreditors({
      organizationId,
      search,
      page,
      pageSize,
    });

    return {
      creditors: response.data.map(c => CreditorResponseDto.fromEntity(c)),
      total: response.total
    };
  }
}
