import { IsNotEmpty, IsString, IsPhoneNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SandboxCallDto {
  @ApiProperty({
    description: 'Phone number to call (E.164 format)',
    example: '+12125551234'
  })
  @IsString()
  @IsNotEmpty()
  // @IsPhoneNumber() // Strict validation might be annoying for testing, keep string for now
  toNumber: string;

  @ApiPropertyOptional({
    description: 'Message to say (Text-to-Speech)',
    example: 'This is a test call from the Debt Lucidity QA Sandbox.'
  })
  @IsString()
  @IsOptional()
  message?: string;
}
