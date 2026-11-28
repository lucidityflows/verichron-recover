import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTwilioConfigDto {
  @ApiProperty({
    description: 'Twilio Account SID',
    example: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  accountSid: string;

  @ApiProperty({
    description: 'Twilio Auth Token',
    example: 'your_auth_token',
  })
  @IsString()
  @IsNotEmpty()
  authToken: string;

  @ApiProperty({
    description: 'Twilio API Key SID',
    example: 'SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  apiKeySid: string;

  @ApiProperty({
    description: 'Twilio API Key Secret',
    example: 'your_api_key_secret',
  })
  @IsString()
  @IsNotEmpty()
  apiKeySecret: string;

  @ApiProperty({
    description: 'Twilio TwiML App SID for outgoing calls',
    example: 'APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  outgoingApplicationSid: string;
}
