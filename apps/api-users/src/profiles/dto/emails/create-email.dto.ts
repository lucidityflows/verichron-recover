import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsBoolean, IsOptional } from 'class-validator';
import { IUserEmailCreate } from '@verichron/contracts';

export class CreateEmailDto implements IUserEmailCreate {
  @ApiProperty({ description: 'The email address.', example: 'john.doe@personal.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Set this email as the user\'s primary email.', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
