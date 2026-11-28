import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectorNote } from './entities';
import {
  CreateCollectorNoteDto,
  UpdateCollectorNoteDto,
  CollectorNoteResponseDto,
  SearchNotesQueryDto,
} from './dto';
import { ContentFormat, NoteType } from '@verichron/enums';

/**
 * Collector Note Service
 *
 * Handles enhanced note management for collectors:
 * - Supports General notes (debtor-specific) and Coaching notes (collector-specific)
 * - Rich text notes with formatting
 * - File attachments
 * - Tag-based categorization
 * - Pinning important notes
 * - Full-text search across notes
 */
@Injectable()
export class CollectorNoteService {
  private readonly logger = new Logger(CollectorNoteService.name);

  constructor(
    @InjectRepository(CollectorNote)
    private readonly collectorNoteRepository: Repository<CollectorNote>,
  ) {}

  /**
   * Create a new collector note
   *
   * @param dto - Note creation data
   * @param collectorUserId - Collector user ID creating the note
   * @param organizationId - Organization ID for scoping
   * @returns Created note
   */
  async createNote(
    dto: CreateCollectorNoteDto,
    collectorUserId: string,
    organizationId: string,
  ): Promise<CollectorNoteResponseDto> {
    const noteType = dto.type || NoteType.GENERAL;
    
    this.logger.log(`Creating ${noteType} note by collector ${collectorUserId}`);

    const note = this.collectorNoteRepository.create({
      organizationId,
      collectorUserId,
      type: noteType,
      targetUserId: dto.targetUserId || null,
      debtorId: dto.debtorId || null,
      title: dto.title || null,
      content: dto.content,
      contentFormat: dto.contentFormat || ContentFormat.PLAINTEXT,
      tags: dto.tags || [],
      isPinned: dto.isPinned || false,
      attachments: dto.attachments || null,
      metadata: dto.metadata || null,
    });

    const saved = await this.collectorNoteRepository.save(note);

    this.logger.log(`Created note ${saved.id}`);

    return this.mapToResponseDto(saved);
  }

  /**
   * Get notes with search and filtering
   *
   * @param currentUserId - Current user ID (for authorization)
   * @param organizationId - Organization ID for scoping
   * @param query - Search and filter parameters
   * @returns List of notes
   */
  async searchNotes(
    currentUserId: string,
    organizationId: string,
    query: SearchNotesQueryDto,
  ): Promise<CollectorNoteResponseDto[]> {
    this.logger.log(`Searching notes for user ${currentUserId}`);

    const queryBuilder = this.collectorNoteRepository
      .createQueryBuilder('note')
      .where('note.organization_id = :organizationId', { organizationId });

    // TODO: Implement proper role check. 
    // For now, if it's a search without a specific targetUserId, 
    // restrict to current user's notes unless they are manager.
    // Assuming for MVP we can check if they are looking for their own or if they provided a target.
    
    if (query.targetUserId) {
      queryBuilder.andWhere('note.target_user_id = :targetUserId', { targetUserId: query.targetUserId });
    } else if (query.debtorId) {
      queryBuilder.andWhere('note.debtor_id = :debtorId', { debtorId: query.debtorId });
    } else {
      // General search - restrict to own notes for now until manager roles are integrated here
      queryBuilder.andWhere('note.collector_user_id = :currentUserId', { currentUserId });
    }

    if (query.type) {
      queryBuilder.andWhere('note.type = :type', { type: query.type });
    }

    // Search in title and content
    if (query.search) {
      queryBuilder.andWhere(
        '(note.title ILIKE :search OR note.content ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Filter by tags
    if (query.tags) {
      const tagArray = query.tags.split(',').map(t => t.trim());
      queryBuilder.andWhere('note.tags && :tags', { tags: tagArray });
    }

    // Filter pinned only
    if (query.pinnedOnly) {
      queryBuilder.andWhere('note.is_pinned = true');
    }

    // Order by pinned first, then most recent
    queryBuilder.orderBy('note.is_pinned', 'DESC');
    queryBuilder.addOrderBy('note.created_at', 'DESC');

    // Pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    queryBuilder.limit(limit).offset(offset);

    const notes = await queryBuilder.getMany();

    return notes.map(n => this.mapToResponseDto(n));
  }

  /**
   * Get a specific note by ID
   */
  async getNote(
    noteId: string,
    currentUserId: string,
    organizationId: string,
  ): Promise<CollectorNoteResponseDto> {
    const note = await this.collectorNoteRepository.findOne({
      where: {
        id: noteId,
        organizationId,
      },
    });

    if (!note) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    // Authorization logic...
    return this.mapToResponseDto(note);
  }

  /**
   * Update an existing note
   */
  async updateNote(
    noteId: string,
    dto: UpdateCollectorNoteDto,
    currentUserId: string,
    organizationId: string,
  ): Promise<CollectorNoteResponseDto> {
    const note = await this.collectorNoteRepository.findOne({
      where: { id: noteId, organizationId },
    });

    if (!note) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    // Only note creator can update
    if (note.collectorUserId !== currentUserId) {
      throw new ForbiddenException('You can only update your own notes');
    }

    // Update fields
    if (dto.title !== undefined) note.title = dto.title || null;
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.contentFormat !== undefined) note.contentFormat = dto.contentFormat;
    if (dto.tags !== undefined) note.tags = dto.tags;
    if (dto.isPinned !== undefined) note.isPinned = dto.isPinned;
    if (dto.attachments !== undefined) note.attachments = dto.attachments || null;
    if (dto.metadata !== undefined) note.metadata = dto.metadata || null;

    const updated = await this.collectorNoteRepository.save(note);
    return this.mapToResponseDto(updated);
  }

  /**
   * Delete a note
   */
  async deleteNote(
    noteId: string,
    currentUserId: string,
    organizationId: string,
  ): Promise<void> {
    const note = await this.collectorNoteRepository.findOne({
      where: { id: noteId, organizationId },
    });

    if (!note) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    if (note.collectorUserId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own notes');
    }

    await this.collectorNoteRepository.remove(note);
  }

  /**
   * Toggle pin status
   */
  async togglePin(
    noteId: string,
    isPinned: boolean,
    currentUserId: string,
    organizationId: string,
  ): Promise<CollectorNoteResponseDto> {
    const note = await this.collectorNoteRepository.findOne({
      where: { id: noteId, organizationId },
    });

    if (!note) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }

    note.isPinned = isPinned;
    const updated = await this.collectorNoteRepository.save(note);
    return this.mapToResponseDto(updated);
  }

  /**
   * Get all notes for a specific debtor
   */
  async getNotesByDebtor(
    debtorId: string,
    currentUserId: string,
    organizationId: string,
  ): Promise<CollectorNoteResponseDto[]> {
    const notes = await this.collectorNoteRepository.find({
      where: {
        organizationId,
        debtorId,
        type: NoteType.GENERAL,
      },
      order: {
        isPinned: 'DESC',
        createdAt: 'DESC',
      },
    });

    return notes.map(n => this.mapToResponseDto(n));
  }

  /**
   * Helper method to map entity to response DTO
   */
  private mapToResponseDto(note: CollectorNote): CollectorNoteResponseDto {
    return {
      id: note.id,
      organizationId: note.organizationId,
      type: note.type,
      collectorUserId: note.collectorUserId,
      createdBy: note.collectorUserId, // Alias for collectorUserId
      createdByName: 'Collector', // TODO: Fetch from users service if needed
      targetUserId: note.targetUserId || undefined,
      debtorId: note.debtorId,
      title: note.title || undefined,
      content: note.content,
      contentFormat: note.contentFormat,
      tags: note.tags,
      isPinned: note.isPinned,
      isSystemGenerated: false,
      debtId: null, // Default if not in entity
      attachments: (note.attachments as any) || undefined,
      metadata: note.metadata || undefined,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }
}
