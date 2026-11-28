import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ImportsService } from './services/imports.service';
import { CreateImportDto } from './dto/create-import.dto';
import {
  ImportJobResponseDto,
  PaginatedImportJobResponseDto,
  QueryImportsDto,
} from './dto/import-job-response.dto';
import { Permissions, JwtAuthGuard, PermissionsGuard, OrgContextGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';
import { InvalidImportFileException } from './errors/invalid-import-file.exception';

import { FileInspectionResponseDto } from './dto/inspect-import.dto';

/**
 * Controller for bulk import operations.
 */
@ApiTags('Portfolio Ingestion')
@ApiBearerAuth()
@Controller('debts/imports/orgs/:organizationId')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  /**
   * Inspect a file and return headers and preview rows.
   */
  @Post('inspect')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Inspect a file for import',
    description: 'Uploads a file and returns discovered headers and preview rows for column mapping.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file to inspect',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File inspected successfully',
    type: FileInspectionResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_WRITE, OrganizationPermission.DEBTS_WRITE)
  async inspect(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<FileInspectionResponseDto> {
    if (!(/^(text\/csv|application\/vnd\.ms-excel|text\/plain)$/.exec(file.mimetype))) {
      throw new InvalidImportFileException(`File type ${file.mimetype} is not supported. Please upload a CSV file.`);
    }
    return this.importsService.inspectFile(file);
  }

  /**
   * Create a new bulk import job with CSV file upload.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new bulk import job',
    description: `
      Create a bulk import job. You can either upload a new file or reference a previously inspected file using tempFileId.
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['portfolioName', 'purchaseDate', 'purchasePrice', 'source'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file containing debt records (optional if tempFileId provided)',
        },
        tempFileId: {
          type: 'string',
          description: 'ID of a previously inspected file',
        },
        columnMapping: {
          type: 'object',
          description: 'Map of source CSV headers to Verichron target fields',
          additionalProperties: { type: 'string' }
        },
        portfolioName: {
          type: 'string',
          example: 'Q1 2024 Credit Card Purchase - First National Bank',
          description: 'Name for the portfolio to be created',
        },
        purchaseDate: {
          type: 'string',
          format: 'date',
          example: '2024-01-15',
          description: 'Date the portfolio was acquired',
        },
        purchasePrice: {
          type: 'number',
          format: 'decimal',
          example: 250000.0,
          description: 'Amount paid to acquire the portfolio',
        },
        source: {
          type: 'string',
          example: 'First National Bank - Charged-off Credit Cards',
          description: 'Origin/source of the portfolio',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import job created successfully. Processing has begun.',
    type: ImportJobResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_WRITE, OrganizationPermission.DEBTS_WRITE)
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createImportDto: CreateImportDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImportJobResponseDto> {
    return this.importsService.create(createImportDto, file);
  }

  /**
   * List all import jobs for the organization.
   */
  @Get()
  @ApiOperation({
    summary: 'List import jobs with filters and pagination',
    description: `
      Retrieve a paginated list of import jobs for the organization.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Import jobs retrieved successfully',
    type: PaginatedImportJobResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_READ)
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: QueryImportsDto,
  ): Promise<PaginatedImportJobResponseDto> {
    return this.importsService.findAll(query);
  }

  /**
   * Get a single import job by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get import job status',
    description: `
      Retrieve detailed status for a specific import job.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Import job UUID',
    type: 'string',
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Import job retrieved successfully',
    type: ImportJobResponseDto,
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_READ)
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImportJobResponseDto> {
    return this.importsService.findOne(id);
  }
}
