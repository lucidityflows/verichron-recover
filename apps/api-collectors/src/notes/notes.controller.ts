import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { CollectorNoteService } from './notes.service';
import {
  CreateCollectorNoteDto,
  UpdateCollectorNoteDto,
  CollectorNoteResponseDto,
  SearchNotesQueryDto,
  TogglePinDto,
} from './dto/collector-note.dto';
import { JwtAuthGuard, CurrentUserId } from '@verichron/auth';

@ApiTags('Collector - Notes')
@Controller('collectors/notes/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollectorNoteController {
  constructor(private readonly collectorNoteService: CollectorNoteService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search and filter notes' })
  @ApiResponse({ status: 200, type: [CollectorNoteResponseDto] })
  async searchNotes(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
    @Query() query: SearchNotesQueryDto,
  ): Promise<CollectorNoteResponseDto[]> {
    return this.collectorNoteService.searchNotes(userId, orgId, query);
  }

  @Get('debtor/:debtorId')
  @ApiOperation({ summary: 'Get all notes for a debtor' })
  @ApiResponse({ status: 200, type: [CollectorNoteResponseDto] })
  async getNotesByDebtor(
    @Param('organizationId') orgId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @CurrentUserId() userId: string,
  ): Promise<CollectorNoteResponseDto[]> {
    return this.collectorNoteService.getNotesByDebtor(debtorId, userId, orgId);
  }

  @Get(':noteId')
  @ApiOperation({ summary: 'Get note by ID' })
  @ApiResponse({ status: 200, type: CollectorNoteResponseDto })
  async getNote(
    @Param('organizationId') orgId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUserId() userId: string,
  ): Promise<CollectorNoteResponseDto> {
    return this.collectorNoteService.getNote(noteId, userId, orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create note' })
  @ApiResponse({ status: 201, type: CollectorNoteResponseDto })
  async createNote(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateCollectorNoteDto,
  ): Promise<CollectorNoteResponseDto> {
    return this.collectorNoteService.createNote(dto, userId, orgId);
  }

  @Patch(':noteId')
  @ApiOperation({ summary: 'Update note' })
  @ApiResponse({ status: 200, type: CollectorNoteResponseDto })
  async updateNote(
    @Param('organizationId') orgId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateCollectorNoteDto,
  ): Promise<CollectorNoteResponseDto> {
    return this.collectorNoteService.updateNote(noteId, dto, userId, orgId);
  }

  @Delete(':noteId')
  @ApiOperation({ summary: 'Delete note' })
  @ApiResponse({ status: 204 })
  async deleteNote(
    @Param('organizationId') orgId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    await this.collectorNoteService.deleteNote(noteId, userId, orgId);
  }

  @Patch(':noteId/toggle-pin')
  @ApiOperation({ summary: 'Toggle pin status' })
  @ApiResponse({ status: 200, type: CollectorNoteResponseDto })
  async togglePin(
    @Param('organizationId') orgId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentUserId() userId: string,
    @Body() dto: TogglePinDto,
  ): Promise<CollectorNoteResponseDto> {
    return this.collectorNoteService.togglePin(noteId, dto.isPinned, userId, orgId);
  }
}