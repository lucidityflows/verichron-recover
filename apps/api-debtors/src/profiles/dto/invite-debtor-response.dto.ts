import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IInviteDebtorResponse } from '@verichron/contracts';

export class InviteDebtorResponseDto implements IInviteDebtorResponse {
  @ApiProperty({
    description: 'Success message',
    example: 'Invitation sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'UUID of the debtor profile',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  debtorId: string;

  @ApiPropertyOptional({
    description: 'UUID of the linked user account (if existing user was linked)',
    example: '789e4567-e89b-12d3-a456-426614174999',
  })
  userId?: string;

  @ApiProperty({
    description: 'Whether an invitation email was sent',
    example: true,
  })
  invitationSent: boolean;
}
