// create-verification-request.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ICreateVerificationRequest } from '@verichron/contracts';
import { VerificationType } from '@verichron/enums/dist';

/**
 * DTO for creating a verification request
 */
export class CreateVerificationRequestDto implements ICreateVerificationRequest {
  @ApiProperty({
    description: 'Type of verification to perform',
    example: VerificationType.ADDRESS_VERIFICATION,
    enum: VerificationType, enumName: 'VerificationType',
  })
  @IsEnum(VerificationType)
  @IsNotEmpty()
  verificationType: VerificationType;

  @ApiProperty({
    description: 'Input data for verification',
    example: {
      address: {
        streetLine1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
      },
    },
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsNotEmpty()
  inputData: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'manual_request', priority: 'high' },
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}