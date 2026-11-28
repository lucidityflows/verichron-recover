import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { IUserEmailUpdate } from '@verichron/contracts';

export class UpdateEmailDto implements IUserEmailUpdate {
  @ApiProperty({
    description: "Set this email as the user's primary email.",
    default: true,
  })
  @IsBoolean()
  isPrimary: boolean;
}
