import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SettlementOffersService } from './settlement-offers.service';
import { SettlementOffer } from './entities/settlement-offer.entity';
import { JwtAuthGuard, PermissionsGuard, OrgContextGuard } from '@verichron/auth';
import { Permissions, OrganizationId, CurrentUserId } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Settlement Offers')
@Controller('transactions/settlement-offers/orgs/:organizationId')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
@ApiBearerAuth()
export class SettlementOffersController {
  constructor(private readonly settlementService: SettlementOffersService) {}

  @Get('pending')
  @Permissions(OrganizationPermission.TRANSACTIONS_READ)
  @ApiOperation({ summary: 'Get all pending settlement offers' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [SettlementOffer] })
  async getPendingOffers(
    @OrganizationId() organizationId: string,
  ) {
    // In a real implementation, we would filter by team/portfolio here
    // For MVP, we return all pending offers for the organization
    return this.settlementService.getPendingOffers(organizationId);
  }

  @Post(':offerId/approve')
  @Permissions(OrganizationPermission.TRANSACTIONS_WRITE)
  @ApiOperation({ summary: 'Approve a settlement offer' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'offerId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SettlementOffer })
  async approveOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.settlementService.acceptOffer(offerId, userId);
  }

  @Post(':offerId/reject')
  @Permissions(OrganizationPermission.TRANSACTIONS_WRITE)
  @ApiOperation({ summary: 'Reject a settlement offer' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'offerId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SettlementOffer })
  async rejectOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.settlementService.rejectOffer(offerId, userId);
  }
}
