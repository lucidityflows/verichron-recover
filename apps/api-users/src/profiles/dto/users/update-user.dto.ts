import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { UserStatus } from '@verichron/enums';
import { IUpdateUser } from '@verichron/contracts';

export class UpdateUserDto implements IUpdateUser {
  @ApiPropertyOptional({
    description: 'The first name of the user.',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'The last name of the user.',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'The status of the user account.',
    enum: UserStatus,
    enumName: 'UserStatus',
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
