import { Controller, Post, Body, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { Permissions, JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Voice Calls')
@ApiBearerAuth()
@Controller('voice/calls/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.VOICE_CALL)
  @ApiOperation({ summary: 'Initiate an outbound call to a debtor' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  initiateCall(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() initiateCallDto: InitiateCallDto,
  ) {
    return this.callsService.initiateCall(organizationId, initiateCallDto);
  }

  @Get(':debtorId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.VOICE_CALL_READ)
  @ApiOperation({ summary: 'Get call history for a specific debtor' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  getCallHistory(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
  ) {
    return this.callsService.getCallHistory(organizationId, debtorId);
  }
}
