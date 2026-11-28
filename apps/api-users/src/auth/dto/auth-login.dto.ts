import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IAuthLogin } from '@verichron/contracts';

export class AuthLoginDto implements IAuthLogin {
  @ApiProperty({
    description: 'User\'s email address',
    example: 'admin@example.com',
  })
  @IsEmail()
  readonly email!: string;

  @ApiProperty({
    description: 'User\'s password',
    example: '!Str0ngP@ssw0rd',
  })
  @IsString()
  @IsNotEmpty()
  readonly password!: string;
}
