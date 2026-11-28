import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { ActivateUserDto, UserDetailDto } from './dto';
import { PermissionsGuard, Public } from '../core';

@ApiTags('Users (Public)')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('public/users/profiles')
export class ProfilesPublicController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('activate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate user account',
    description: 'Activates a pending user account using the invitation token and sets the password. This is a public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'User account activated successfully',
    type: UserDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired invitation token',
  })
  async activateUser(
    @Body() dto: ActivateUserDto
  ): Promise<UserDetailDto> {
    return this.profilesService.activateUser(dto);
  }
}
