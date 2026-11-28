import { IsString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IInviteDebtor } from '@verichron/contracts';

export class InviteDebtorDto implements IInviteDebtor {
  @ApiProperty({
    description: 'Email address for the debtor user account',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @ApiProperty({
    description: 'First name of the debtor',
    example: 'John',
    maxLength: 100,
  })
  @IsString({ message: 'firstName must be a string' })
  @IsNotEmpty({ message: 'firstName is required' })
  @MaxLength(100, { message: 'firstName cannot exceed 100 characters' })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the debtor',
    example: 'Doe',
    maxLength: 100,
  })
  @IsString({ message: 'lastName must be a string' })
  @IsNotEmpty({ message: 'lastName is required' })
  @MaxLength(100, { message: 'lastName cannot exceed 100 characters' })
  lastName: string;
}
