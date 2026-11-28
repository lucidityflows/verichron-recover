import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, Permissions, SkipOrgContext } from '@verichron/auth';
import { PlatformPermission } from '@verichron/enums';
import { EventPublisher } from '@verichron/event-publisher';
import { EventType } from '@verichron/events';
import { IsString, IsObject, IsNotEmpty } from 'class-validator';

/**
 * DTO for manual event injection
 */
export class TriggerEventDto {
  @ApiProperty({ description: 'The type of event to trigger', example: 'DEBTS.PORTFOLIO.IMPORT_COMPLETED' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ description: 'Organization ID to scope the event to', example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'The payload for the event (Must match the expected event DTO schema)', example: { portfolioId: 'uuid' } })
  @IsObject()
  payload: Record<string, any>;
}

/**
 * Placeholder DTO for raw event injection.
 * Used to bypass strict outgoing validation for admin tools.
 */
class RawEventDto {
  constructor(data: any) {
    Object.assign(this, data);
  }
}

@ApiTags('Ops: Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext()
@Controller('ops/events')
export class EventsOpsController {
  constructor(private readonly eventPublisher: EventPublisher) {}

  @Post('trigger')
  @Permissions(PlatformPermission.SYSTEM_SETTINGS)
  @ApiOperation({ summary: 'Manually trigger a system event (Admin Injection Protocol)' })
  @ApiResponse({ status: 201, description: 'Event successfully injected into the mesh.' })
  async triggerEvent(@Body() dto: TriggerEventDto) {
    // For admin injection, we bypass strict DTO validation by using a generic wrapper.
    // This allows support staff to re-fire any event without the API having to maintain 
    // imports for every single event DTO in the system.
    return this.eventPublisher.publish(
      dto.eventType as EventType,
      { ...dto.payload, organizationId: dto.organizationId },
      RawEventDto as any
    );
  }
}
