import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { HistoryService } from './debt-ownership-history.service';
import {
  QueryHistoryDto,
  DebtOwnershipChainResponseDto,
} from './dto/ownership-history-response.dto';
import { Permissions, JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

/**
 * Controller for debt ownership history operations.
 */
@ApiTags('Ownership History')
@ApiBearerAuth()
@Controller('debts/history/orgs/:organizationId/debts/:debtId')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /**
   * Get complete ownership history for a debt (chain of title).
   */
  @Get()
  @Permissions(OrganizationPermission.DEBTS_READ)
  @ApiOperation({
    summary: 'Get complete ownership history for a debt',
    description: `
      Retrieve the complete chain of title for a debt showing all ownership transfers
      from the original creditor to the current owner.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtId',
    description: 'Debt UUID to retrieve ownership history for',
    type: 'string',
    format: 'uuid',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Ownership history retrieved successfully',
    type: DebtOwnershipChainResponseDto,
  })
  async getDebtHistory(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtId', ParseUUIDPipe) debtId: string,
    @Query() query: QueryHistoryDto,
  ): Promise<DebtOwnershipChainResponseDto> {
    return this.historyService.findDebtHistory(debtId, query);
  }
}