import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, Permissions, SkipOrgContext } from '@verichron/auth';
import { PlatformPermission } from '@verichron/enums';
import { TransactionsOpsService } from './transactions.ops.service';
import { PaymentGatewayStatusResponseDto } from './gateways/dto/payment-gateway-status.dto';

@ApiTags('Ops: Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/transactions')
export class TransactionsOpsController {
  constructor(private readonly opsService: TransactionsOpsService) {}

  @Get('gateways/status')
  @Permissions(PlatformPermission.AUDIT_VIEW)
  @ApiOperation({ summary: 'Get current health and configuration status of payment gateways' })
  @ApiResponse({ status: 200, description: 'Consolidated gateway health report.', type: PaymentGatewayStatusResponseDto })
  async getGatewayStatus(): Promise<PaymentGatewayStatusResponseDto> {
    return this.opsService.getGatewayStatus() as Promise<PaymentGatewayStatusResponseDto>;
  }
}
