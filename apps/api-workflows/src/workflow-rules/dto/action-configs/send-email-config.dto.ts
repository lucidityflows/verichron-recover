import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsUUID } from 'class-validator';

export class SendEmailConfigDto {
  @ApiProperty({ description: 'ID of the email template to use' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiPropertyOptional({ description: 'Display name of the template' })
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiPropertyOptional({ description: 'Delay in days before sending the email', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  delayDays?: number;

  @ApiPropertyOptional({ description: 'Recipient role or specific address', example: 'DEBTOR' })
  @IsString()
  @IsOptional()
  recipient?: string;
}
