import { ApiProperty } from '@nestjs/swagger';

export class FileInspectionResponseDto {
  @ApiProperty({ 
    description: 'Temporary file ID for use in the follow-up import execution',
    example: 'temp_123456789' 
  })
  tempFileId: string;

  @ApiProperty({ 
    description: 'Raw headers discovered in the uploaded file',
    example: ['Account Number', 'Principal', 'Creditor Name', 'Debt Date'] 
  })
  headers: string[];

  @ApiProperty({ 
    description: 'Preview of the first few rows of data',
    example: [{ 'Account Number': '8821-0029-11', 'Principal': '1240.50' }] 
  })
  previewRows: Record<string, string>[];
}
