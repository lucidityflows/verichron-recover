import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DispatchMethod } from '@verichron/enums';

export class SandboxDispatchDto {
  @ApiProperty({
    enum: DispatchMethod,
    enumName: 'DispatchMethod',
    description: 'Channel to send test communication via',
    example: DispatchMethod.EMAIL
  })
  @IsEnum(DispatchMethod)
  @IsNotEmpty()
  method: DispatchMethod;

  @ApiProperty({
    description: 'Recipient address (Email or Phone Number)',
    example: 'test@example.com'
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'Name of the template to render',
    example: 'USER_INVITATION'
  })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiPropertyOptional({
    description: 'Context data for template rendering',
    example: { user: { firstName: 'Test' } }
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}
