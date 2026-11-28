import { ApiProperty } from '@nestjs/swagger';
import { TwilioConfig } from '../entities/twilio-config.entity';

export class TwilioConfigResponseDto {
  @ApiProperty({
    description: 'Unique ID of the Twilio configuration',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the organization this configuration belongs to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Twilio Account SID',
    example: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  accountSid: string;

  @ApiProperty({
    description: 'Twilio API Key SID',
    example: 'SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  apiKeySid: string;

  @ApiProperty({
    description: 'Twilio TwiML App SID for outgoing calls',
    example: 'APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  outgoingApplicationSid: string;

  @ApiProperty({
    description: 'Date when the configuration was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when the configuration was last updated',
    example: '2023-10-27T10:00:00.000Z',
  })
  updatedAt: Date;

  constructor(config: TwilioConfig) {
    this.id = config.id;
    this.organizationId = config.organizationId;
    this.accountSid = config.accountSid;
    this.apiKeySid = config.apiKeySid;
    this.outgoingApplicationSid = config.outgoingApplicationSid;
    this.createdAt = config.createdAt;
    this.updatedAt = config.updatedAt;
  }
}
