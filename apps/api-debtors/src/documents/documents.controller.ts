import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

// Type definition for uploaded file (matches Multer.File interface)
interface UploadedFileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { PaginatedDocumentsDto } from './dto/paginated-documents.dto';
import { DownloadUrlDto } from './dto/download-url.dto';
import { StorageUsageDto } from './dto/storage-usage.dto';
import { Document } from './entities/document.entity';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

/**
 * Documents Controller
 * 
 * Manages debtor-specific documents with Google Cloud Storage integration.
 */
@ApiTags('Debtor Documents')
@ApiBearerAuth()
@Controller('debtors/documents/orgs/:organizationId/debtors/:debtorId')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DOCUMENTS_READ)
  @ApiOperation({
    summary: 'List all documents for a debtor',
    description:
      'Retrieve a paginated list of documents for a debtor with optional filtering.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: PaginatedDocumentsDto,
  })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Query() query: QueryDocumentsDto,
  ) {
    return this.documentsService.findAll(debtorId, query);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DOCUMENTS_READ)
  @ApiOperation({
    summary: 'Get document metadata',
    description:
      'Retrieve metadata for a specific document. To download the file, use the /download endpoint.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    example: '123e4567-e89b-12d3-a456-426614174006',
  })
  @ApiResponse({
    status: 200,
    description: 'Document metadata retrieved successfully',
    type: Document,
  })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Document> {
    return this.documentsService.findOne(id, debtorId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DOCUMENTS_WRITE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a document',
    description:
      'Upload a document file and create metadata record. ' +
      'File is stored in Google Cloud Storage. ' +
      'Maximum file size: 10MB. ' +
      'Allowed types: PDF, images, Word documents, Excel spreadsheets, text files.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'Document file and metadata',
    type: UploadDocumentDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: Document,
  })
  async upload(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @UploadedFile() file: UploadedFileType,
    @Body() uploadDto: UploadDocumentDto,
  ): Promise<Document> {
    return this.documentsService.upload(
      debtorId,
      file,
      uploadDto,
    );
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DOCUMENTS_WRITE)
  @ApiOperation({
    summary: 'Update document metadata',
    description:
      'Update document metadata. This does NOT update the file itself. ' +
      'To replace a file, delete the old document and upload a new one.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    example: '123e4567-e89b-12d3-a456-426614174006',
  })
  @ApiResponse({
    status: 200,
    description: 'Document metadata updated successfully',
    type: Document,
  })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDocumentDto,
  ): Promise<Document> {
    return this.documentsService.update(
      id,
      debtorId,
      updateDto,
    );
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DOCUMENTS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete (archive) a document',
    description:
      'Soft delete a document by marking it as archived.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    example: '123e4567-e89b-12d3-a456-426614174006',
  })
  @ApiResponse({
    status: 204,
    description: 'Document deleted successfully',
  })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.documentsService.remove(id, debtorId);
  }

  @Get(':id/download')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DOCUMENTS_READ)
  @ApiOperation({
    summary: 'Get signed download URL',
    description:
      'Generate a time-limited signed URL for downloading the document file.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    example: '123e4567-e89b-12d3-a456-426614174006',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated successfully',
    type: DownloadUrlDto,
  })
  async generateDownloadUrl(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const url = await this.documentsService.generateSignedUrl(
      id,
      debtorId,
      60, // 1 hour
    );

    return {
      url,
      expiresIn: 3600, // seconds
    };
  }

  @Post(':id/archive')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DOCUMENTS_WRITE)
  @ApiOperation({
    summary: 'Archive a document',
    description:
      'Soft delete a document by marking it as archived.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    example: '123e4567-e89b-12d3-a456-426614174006',
  })
  @ApiResponse({
    status: 200,
    description: 'Document archived successfully',
    type: Document,
  })
  async archive(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Document> {
    return this.documentsService.archive(id, debtorId);
  }

  @Get('storage-usage')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DOCUMENTS_READ)
  @ApiOperation({
    summary: 'Get total storage usage for debtor',
    description: 'Calculate total storage used by all non-archived documents for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage usage calculated successfully',
    type: StorageUsageDto,
  })
  async getStorageUsage(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
  ): Promise<{ bytes: number; megabytes: number }> {
    const bytes = await this.documentsService.getStorageUsage(
      debtorId,
    );
    return {
      bytes,
      megabytes: parseFloat((bytes / (1024 * 1024)).toFixed(2)),
    };
  }
}