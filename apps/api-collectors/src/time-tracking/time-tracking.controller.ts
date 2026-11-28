import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TimeTrackingService } from './time-tracking.service';
import {
  StartSessionDto,
  EndSessionDto,
  TimeTrackingSessionResponseDto,
  TimeTrackingQueryDto,
  CollectorTimeReportDto,
  TimeReportQueryDto,
} from './dto/time-tracking.dto';
import { JwtAuthGuard, CurrentUserId } from '@verichron/auth';

@ApiTags('Collector - Time Tracking')
@Controller('collectors/time-tracking/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start time tracking session' })
  @ApiResponse({ status: 201, type: TimeTrackingSessionResponseDto })
  async startSession(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
    @Body() dto: StartSessionDto,
  ): Promise<TimeTrackingSessionResponseDto> {
    return this.timeTrackingService.startSession(dto, userId, orgId);
  }

  @Patch('sessions/:sessionId/end')
  @ApiOperation({ summary: 'End time tracking session' })
  @ApiResponse({ status: 200, type: TimeTrackingSessionResponseDto })
  async endSession(
    @Param('organizationId') orgId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUserId() userId: string,
    @Body() dto: EndSessionDto,
  ): Promise<TimeTrackingSessionResponseDto> {
    return this.timeTrackingService.endSession(sessionId, dto, userId, orgId);
  }

  @Patch('sessions/:sessionId/pause')
  @ApiOperation({ summary: 'Pause time tracking session' })
  @ApiResponse({ status: 200, type: TimeTrackingSessionResponseDto })
  async pauseSession(
    @Param('organizationId') orgId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUserId() userId: string,
  ): Promise<TimeTrackingSessionResponseDto> {
    return this.timeTrackingService.pauseSession(sessionId, userId, orgId);
  }

  @Patch('sessions/:sessionId/resume')
  @ApiOperation({ summary: 'Resume paused session' })
  @ApiResponse({ status: 200, type: TimeTrackingSessionResponseDto })
  async resumeSession(
    @Param('organizationId') orgId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUserId() userId: string,
  ): Promise<TimeTrackingSessionResponseDto> {
    return this.timeTrackingService.resumeSession(sessionId, userId, orgId);
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Get active session' })
  @ApiResponse({ status: 200, type: TimeTrackingSessionResponseDto })
  async getActiveSession(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
  ): Promise<TimeTrackingSessionResponseDto | null> {
    return this.timeTrackingService.getActiveSession(userId, orgId);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, type: TimeTrackingSessionResponseDto })
  async getSession(
    @Param('organizationId') orgId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUserId() userId: string,
  ): Promise<TimeTrackingSessionResponseDto> {
    return this.timeTrackingService.getSession(sessionId, userId, orgId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Query time tracking sessions' })
  @ApiResponse({ status: 200, type: [TimeTrackingSessionResponseDto] })
  async querySessions(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
    @Query() query: TimeTrackingQueryDto,
  ): Promise<TimeTrackingSessionResponseDto[]> {
    return this.timeTrackingService.querySessions(userId, orgId, query);
  }

  @Get('reports/utilization')
  @ApiOperation({ summary: 'Generate time utilization report' })
  @ApiResponse({ status: 200, type: CollectorTimeReportDto })
  async generateTimeReport(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
    @Query() query: TimeReportQueryDto,
  ): Promise<CollectorTimeReportDto> {
    return this.timeTrackingService.generateTimeReport(userId, orgId, query);
  }
}