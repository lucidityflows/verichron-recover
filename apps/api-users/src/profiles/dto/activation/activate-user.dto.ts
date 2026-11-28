import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Validate } from 'class-validator';
import { Exclude } from 'class-transformer';
import { MatchConstraint } from '../../../core/validators';

export class ActivateUserDto {
  @ApiProperty({
    description: 'The one-time invitation token sent to the user.',
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  })
  @IsString()
  @IsNotEmpty()
  invitationToken: string;

  @ApiProperty({
    description: 'The desired password for the new user. Must be at least 8 characters.',
    example: '!Str0ngP@ssw0rd',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Exclude({ toPlainOnly: true })
  password: string;

  @ApiProperty({
    description: 'Confirmation of the new password.',
    example: '!Str0ngP@ssw0rd',
  })
  @IsString()
  @MinLength(8)
  @Validate(MatchConstraint, ['password'], {
    message: 'Passwords do not match',
  })
  @Exclude({ toPlainOnly: true })
  passwordConfirmation: string;
}
