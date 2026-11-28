import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SandboxDispatchDto } from './sandbox-dispatch.dto';

export class SandboxOpsDispatchDto extends SandboxDispatchDto {
  @ApiProperty({
    description: 'Organization ID to simulate dispatch for',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;
}
