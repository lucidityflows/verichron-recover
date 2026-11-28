import { ApiProperty } from '@nestjs/swagger';

export class DownloadUrlDto {
  @ApiProperty({
    description: 'The pre-signed URL for downloading the document',
    example: 'https://storage.googleapis.com/bucket/path?signature=...',
  })
  url: string;

  @ApiProperty({
    description: 'Expiration time of the URL in seconds',
    example: 3600,
  })
  expiresIn: number;
}
