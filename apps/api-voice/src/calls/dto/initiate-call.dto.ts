import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class InitiateCallDto {
  @ApiProperty({
    description: 'The UUID of the debtor to call',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @ApiProperty({
    description: 'The phone number to call',
    example: '+15551234567',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
