import { ApiProperty } from '@nestjs/swagger';
import { IMetadata } from '@verichron/contracts';

export class MetadataDto implements IMetadata {
  @ApiProperty({ description: 'Duration of an event (e.g., call duration)', example: '5m', nullable: true })
  duration?: string;

  @ApiProperty({ description: 'Outcome of an event (e.g., call outcome)', example: 'Left Voicemail', nullable: true })
  outcome?: string;
}
