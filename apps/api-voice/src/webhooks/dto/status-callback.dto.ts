import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { CallStatus } from '@verichron/enums';

export class StatusCallbackDto {
  @ApiProperty()
  @IsString()
  CallSid: string;

  @ApiProperty()
  @IsString()
  AccountSid: string;

  @ApiProperty()
  @IsString()
  From: string;

  @ApiProperty()
  @IsString()
  To: string;

  @ApiProperty({ enum: CallStatus })
  @IsEnum(CallStatus)
  CallStatus: CallStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  CallDuration?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  RecordingUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  RecordingSid?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  RecordingDuration?: string;
}
