import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
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
import { PreferencesService } from './preferences.service';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@verichron/auth';
import { UpdatePreferenceDto, OptOutDto, OptInDto } from './dto';
import { OrganizationPermission, DebtorPermission } from '@verichron/enums';

@ApiTags('Communication Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications/preferences/orgs/:organizationId')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get(':debtorId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DEBTORS_READ, DebtorPermission.SELF_PREFERENCES)
  @ApiOperation({ summary: "Get a debtor's communication preferences" })
  @ApiResponse({ status: 200, description: 'The debtor preferences.' })
  @ApiResponse({ status: 404, description: 'Preferences not found for the debtor.' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findByDebtor(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
  ) {
    return this.preferencesService.findByDebtor(debtorId, organizationId);
  }

  @Put(':debtorId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DEBTORS_WRITE, DebtorPermission.SELF_PREFERENCES)
  @ApiOperation({ summary: "Update a debtor's communication preferences" })
  @ApiResponse({ status: 200, description: 'The updated preferences.' })
  @ApiResponse({ status: 400, description: 'Invalid preference data.' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Body() updatePreferenceDto: UpdatePreferenceDto,
  ) {
    return this.preferencesService.update(
      debtorId,
      organizationId,
      updatePreferenceDto,
    );
  }

  @Post(':debtorId/opt-out')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DEBTORS_WRITE, DebtorPermission.SELF_PREFERENCES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Opt a debtor out of a communication channel' })
  @ApiResponse({ status: 204, description: 'Opt-out successful.' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  optOut(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Body() optOutDto: OptOutDto,
  ) {
    return this.preferencesService.optOut(
      debtorId,
      organizationId,
      optOutDto.channel,
    );
  }

  @Post(':debtorId/opt-in')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DEBTORS_WRITE, DebtorPermission.SELF_PREFERENCES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Opt a debtor back into a communication channel' })
  @ApiResponse({ status: 204, description: 'Opt-in successful.' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  optIn(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Body() optInDto: OptInDto,
  ) {
    return this.preferencesService.optIn(
      debtorId,
      organizationId,
      optInDto.channel,
    );
  }
}
