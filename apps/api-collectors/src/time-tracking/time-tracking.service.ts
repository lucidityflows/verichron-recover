import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TimeTrackingSession } from './entities';
import {
  StartSessionDto,
  EndSessionDto,
  TimeTrackingSessionResponseDto,
  TimeTrackingQueryDto,
  CollectorTimeReportDto,
  TimeReportQueryDto,
} from './dto';
import { TimeTrackingSessionStatus } from '@verichron/enums';

/**
 * Time Tracking Service
 *
 * Manages collector time tracking sessions for productivity and utilization analysis:
 * - Start/stop/pause/resume sessions
 * - Track active and idle time
 * - Calculate utilization metrics
 * - Generate time reports
 */
@Injectable()
export class TimeTrackingService {
  private readonly logger = new Logger(TimeTrackingService.name);

  constructor(
    @InjectRepository(TimeTrackingSession)
    private readonly timeTrackingRepository: Repository<TimeTrackingSession>,
  ) {}

  /**
   * Start a new time tracking session
   *
   * @param dto - Session start data
   * @param collectorUserId - Collector user ID
   * @param organizationId - Organization ID
   * @returns Created session
   */
  async startSession(
    dto: StartSessionDto,
    collectorUserId: string,
    organizationId: string,
  ): Promise<TimeTrackingSessionResponseDto> {
    this.logger.log(`Starting session for collector ${collectorUserId}`);

    // Check if there's already an active session
    const activeSession = await this.timeTrackingRepository.findOne({
      where: {
        organizationId,
        collectorUserId,
        status: TimeTrackingSessionStatus.ACTIVE,
      },
    });

    if (activeSession) {
      throw new BadRequestException(
        'You already have an active session. Please end or pause the current session first.',
      );
    }

    const now = new Date();
    const session = this.timeTrackingRepository.create({
      organizationId,
      collectorUserId,
      debtorId: dto.debtorId || null,
      startTime: now,
      status: TimeTrackingSessionStatus.ACTIVE,
      lastActivityTime: now,
      totalActiveSeconds: 0,
      totalIdleSeconds: 0,
      metadata: dto.metadata || null,
    });

    const saved = await this.timeTrackingRepository.save(session);

    this.logger.log(`Started session ${saved.id} for collector ${collectorUserId}`);

    return this.mapToResponseDto(saved);
  }

  /**
   * End a time tracking session
   *
   * @param sessionId - Session ID to end
   * @param dto - End session data
   * @param collectorUserId - Collector user ID (for authorization)
   * @param organizationId - Organization ID
   * @returns Updated session
   */
  async endSession(
    sessionId: string,
    dto: EndSessionDto,
    collectorUserId: string,
    organizationId: string,
  ): Promise<TimeTrackingSessionResponseDto> {
    this.logger.log(`Ending session ${sessionId}`);

    const session = await this.timeTrackingRepository.findOne({
      where: {
        id: sessionId,
        organizationId,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Authorization: only session owner can end it
    if (session.collectorUserId !== collectorUserId) {
      throw new ForbiddenException('You can only end your own sessions');
    }

    if (session.status === TimeTrackingSessionStatus.COMPLETED) {
      throw new BadRequestException('Session is already completed');
    }

    const now = new Date();

    // If session was paused, add time since pause to idle time
    if (session.status === TimeTrackingSessionStatus.PAUSED && session.pauseStartTime) {
      const idleTime = Math.floor(
        (now.getTime() - session.pauseStartTime.getTime()) / 1000,
      );
      session.totalIdleSeconds += idleTime;
    }

    // If session was active, add time since last activity to active time
    if (
      session.status === TimeTrackingSessionStatus.ACTIVE &&
      session.lastActivityTime
    ) {
      const activeTime = Math.floor(
        (now.getTime() - session.lastActivityTime.getTime()) / 1000,
      );
      session.totalActiveSeconds += activeTime;
    }

    session.endTime = now;
    session.status = TimeTrackingSessionStatus.COMPLETED;

    // Merge metadata if provided
    if (dto.metadata) {
      session.metadata = {
        ...(session.metadata || {}),
        ...dto.metadata,
      };
    }

    const updated = await this.timeTrackingRepository.save(session);

    this.logger.log(`Ended session ${sessionId}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Pause a time tracking session
   *
   * @param sessionId - Session ID to pause
   * @param collectorUserId - Collector user ID (for authorization)
   * @param organizationId - Organization ID
   * @returns Updated session
   */
  async pauseSession(
    sessionId: string,
    collectorUserId: string,
    organizationId: string,
  ): Promise<TimeTrackingSessionResponseDto> {
    this.logger.log(`Pausing session ${sessionId}`);

    const session = await this.timeTrackingRepository.findOne({
      where: {
        id: sessionId,
        organizationId,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Authorization: only session owner can pause it
    if (session.collectorUserId !== collectorUserId) {
      throw new ForbiddenException('You can only pause your own sessions');
    }

    if (session.status !== TimeTrackingSessionStatus.ACTIVE) {
      throw new BadRequestException('Only active sessions can be paused');
    }

    const now = new Date();

    // Calculate active time since last activity
    if (session.lastActivityTime) {
      const activeTime = Math.floor(
        (now.getTime() - session.lastActivityTime.getTime()) / 1000,
      );
      session.totalActiveSeconds += activeTime;
    }

    session.status = TimeTrackingSessionStatus.PAUSED;
    session.pauseStartTime = now;

    const updated = await this.timeTrackingRepository.save(session);

    this.logger.log(`Paused session ${sessionId}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Resume a paused time tracking session
   *
   * @param sessionId - Session ID to resume
   * @param collectorUserId - Collector user ID (for authorization)
   * @param organizationId - Organization ID
   * @returns Updated session
   */
  async resumeSession(
    sessionId: string,
    collectorUserId: string,
    organizationId: string,
  ): Promise<TimeTrackingSessionResponseDto> {
    this.logger.log(`Resuming session ${sessionId}`);

    const session = await this.timeTrackingRepository.findOne({
      where: {
        id: sessionId,
        organizationId,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Authorization: only session owner can resume it
    if (session.collectorUserId !== collectorUserId) {
      throw new ForbiddenException('You can only resume your own sessions');
    }

    if (session.status !== TimeTrackingSessionStatus.PAUSED) {
      throw new BadRequestException('Only paused sessions can be resumed');
    }

    const now = new Date();

    // Calculate idle time since pause
    if (session.pauseStartTime) {
      const idleTime = Math.floor(
        (now.getTime() - session.pauseStartTime.getTime()) / 1000,
      );
      session.totalIdleSeconds += idleTime;
    }

    session.status = TimeTrackingSessionStatus.ACTIVE;
    session.lastActivityTime = now;
    session.pauseStartTime = null;

    const updated = await this.timeTrackingRepository.save(session);

    this.logger.log(`Resumed session ${sessionId}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Get the current active session for a collector
   *
   * @param collectorUserId - Collector user ID
   * @param organizationId - Organization ID
   * @returns Active session or null
   */
  async getActiveSession(
    collectorUserId: string,
    organizationId: string,
  ): Promise<TimeTrackingSessionResponseDto | null> {
    this.logger.log(`Fetching active session for collector ${collectorUserId}`);

    const session = await this.timeTrackingRepository.findOne({
      where: {
        organizationId,
        collectorUserId,
        status: TimeTrackingSessionStatus.ACTIVE,
      },
    });

    if (!session) {
      return null;
    }

    return this.mapToResponseDto(session);
  }

  /**
   * Query time tracking sessions with filters
   *
   * @param collectorUserId - Collector user ID (for authorization)
   * @param organizationId - Organization ID
   * @param query - Query filters
   * @returns List of sessions
   */
  async querySessions(
    collectorUserId: string,
    organizationId: string,
    query: TimeTrackingQueryDto,
  ): Promise<TimeTrackingSessionResponseDto[]> {
    this.logger.log(`Querying sessions for collector ${collectorUserId}`);

    const queryBuilder = this.timeTrackingRepository
      .createQueryBuilder('session')
      .where('session.organization_id = :organizationId', { organizationId })
      .andWhere('session.collector_user_id = :collectorUserId', {
        collectorUserId: query.collectorUserId || collectorUserId,
      });

    // Filter by debtor
    if (query.debtorId) {
      queryBuilder.andWhere('session.debtor_id = :debtorId', {
        debtorId: query.debtorId,
      });
    }

    // Filter by status
    if (query.status) {
      queryBuilder.andWhere('session.status = :status', { status: query.status });
    }

    // Filter by date range
    if (query.startDate) {
      queryBuilder.andWhere('session.start_time >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      queryBuilder.andWhere(
        '(session.end_time <= :endDate OR session.end_time IS NULL)',
        { endDate: query.endDate },
      );
    }

    // Order by most recent
    queryBuilder.orderBy('session.start_time', 'DESC');

    // Pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    queryBuilder.limit(limit).offset(offset);

    const sessions = await queryBuilder.getMany();

    this.logger.log(`Found ${sessions.length} sessions`);

    return sessions.map(s => this.mapToResponseDto(s));
  }

  /**
   * Generate time utilization report for a collector
   *
   * @param collectorUserId - Collector user ID
   * @param organizationId - Organization ID
   * @param query - Report parameters
   * @returns Time utilization report
   */
  async generateTimeReport(
    collectorUserId: string,
    organizationId: string,
    query: TimeReportQueryDto,
  ): Promise<CollectorTimeReportDto> {
    this.logger.log(`Generating time report for collector ${collectorUserId}`);

    const targetCollectorId = query.collectorUserId || collectorUserId;

    // Query all completed sessions in date range
    const sessions = await this.timeTrackingRepository.find({
      where: {
        organizationId,
        collectorUserId: targetCollectorId,
        status: TimeTrackingSessionStatus.COMPLETED,
        startTime: Between(new Date(query.startDate), new Date(query.endDate)),
      },
      order: {
        startTime: 'ASC',
      },
    });

    const totalSessions = sessions.length;
    const totalActiveSeconds = sessions.reduce(
      (sum, s) => sum + s.totalActiveSeconds,
      0,
    );
    const totalIdleSeconds = sessions.reduce((sum, s) => sum + s.totalIdleSeconds, 0);
    const totalSeconds = totalActiveSeconds + totalIdleSeconds;

    const avgActiveSecondsPerSession =
      totalSessions > 0 ? Math.round(totalActiveSeconds / totalSessions) : 0;
    const avgSessionDurationSeconds =
      totalSessions > 0 ? Math.round(totalSeconds / totalSessions) : 0;
    const utilizationRate =
      totalSeconds > 0 ? Math.round((totalActiveSeconds / totalSeconds) * 1000) / 10 : 0;

    // Count unique debtors
    const uniqueDebtorIds = new Set(
      sessions.filter(s => s.debtorId).map(s => s.debtorId),
    );
    const uniqueDebtorsCount = uniqueDebtorIds.size;

    const report: CollectorTimeReportDto = {
      collectorUserId: targetCollectorId,
      startDate: query.startDate,
      endDate: query.endDate,
      totalSessions,
      totalActiveSeconds,
      totalIdleSeconds,
      totalSeconds,
      avgActiveSecondsPerSession,
      avgSessionDurationSeconds,
      utilizationRate,
      uniqueDebtorsCount,
    };

    // Generate daily breakdown if requested
    if (query.includeDailyBreakdown) {
      const dailyMap = new Map<
        string,
        {
          sessions: number;
          activeSeconds: number;
          idleSeconds: number;
        }
      >();

      sessions.forEach(session => {
        const dateKey = session.startTime.toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey) || {
          sessions: 0,
          activeSeconds: 0,
          idleSeconds: 0,
        };

        dailyMap.set(dateKey, {
          sessions: existing.sessions + 1,
          activeSeconds: existing.activeSeconds + session.totalActiveSeconds,
          idleSeconds: existing.idleSeconds + session.totalIdleSeconds,
        });
      });

      report.dailyBreakdown = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          sessions: data.sessions,
          activeSeconds: data.activeSeconds,
          idleSeconds: data.idleSeconds,
          utilizationRate:
            data.activeSeconds + data.idleSeconds > 0
              ? Math.round(
                  (data.activeSeconds / (data.activeSeconds + data.idleSeconds)) * 1000,
                ) / 10
              : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    this.logger.log(`Generated time report for collector ${targetCollectorId}`);

    return report;
  }

  /**
   * Get a specific session by ID
   *
   * @param sessionId - Session ID
   * @param collectorUserId - Collector user ID (for authorization)
   * @param organizationId - Organization ID
   * @returns Session
   */
  async getSession(
    sessionId: string,
    collectorUserId: string,
    organizationId: string,
  ): Promise<TimeTrackingSessionResponseDto> {
    this.logger.log(`Fetching session ${sessionId}`);

    const session = await this.timeTrackingRepository.findOne({
      where: {
        id: sessionId,
        organizationId,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Authorization: only session owner can view (unless manager - would need role check)
    if (session.collectorUserId !== collectorUserId) {
      throw new ForbiddenException('You can only view your own sessions');
    }

    return this.mapToResponseDto(session);
  }

  /**
   * Helper method to map entity to response DTO
   */
  private mapToResponseDto(
    session: TimeTrackingSession,
  ): TimeTrackingSessionResponseDto {
    const totalDurationSeconds = session.totalActiveSeconds + session.totalIdleSeconds;

    return {
      id: session.id,
      organizationId: session.organizationId,
      collectorUserId: session.collectorUserId,
      debtorId: session.debtorId || undefined,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() || undefined,
      status: session.status,
      totalActiveSeconds: session.totalActiveSeconds,
      totalIdleSeconds: session.totalIdleSeconds,
      totalDurationSeconds,
      metadata: session.metadata || undefined,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
