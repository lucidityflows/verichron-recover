import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as DTOs from './dto/realtime-events.dto';
import { SettlementAuthorityMatrix, ApprovalThreshold } from '../strategy';

/**
 * RealtimeDocsController
 * 
 * PURPOSE:
 * This controller exists SOLELY to expose WebSocket payload shapes to the OpenAPI specification.
 * This allows Orval to generate high-fidelity TypeScript interfaces for the frontend.
 * 
 * These endpoints are not intended to be called at runtime.
 */
@ApiTags('Internal - Realtime Documentation')
@Controller('internal/organizations/realtime/docs')
export class RealtimeDocsController {
  
  @Get('schema-definitions')
  @ApiOperation({
    summary: 'Exposes WS DTOs for Orval generation',
    description: 'Returns no data. Only used for type generation.'
  })
  @ApiResponse({ status: 200, type: DTOs.WSUserStatusChangedDto })
  @ApiResponse({ status: 201, type: DTOs.WSTeamMemberAddedDto })
  @ApiResponse({ status: 202, type: DTOs.WSDebtStatusChangedDto })
  @ApiResponse({ status: 203, type: DTOs.WSPaymentReceivedDto })
  @ApiResponse({ status: 204, type: DTOs.WSWorkItemAssignedDto })
  @ApiResponse({ status: 205, type: DTOs.WSComplianceBlockedDto })
  @ApiResponse({ status: 206, type: DTOs.WSSettlementRequestedDto })
  @ApiResponse({ status: 207, type: DTOs.WSGoalProgressUpdatedDto })
  @ApiResponse({ status: 208, type: DTOs.WSEventTypeDto })
  @ApiResponse({ status: 209, type: [SettlementAuthorityMatrix] })
  @ApiResponse({ status: 210, type: [ApprovalThreshold] })
  @ApiResponse({ status: 212, type: DTOs.WSSystemNotificationDto })
  getDefinitions() {
    return null;
  }
}