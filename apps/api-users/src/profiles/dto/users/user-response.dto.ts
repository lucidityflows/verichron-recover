import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@verichron/enums';

export class UserResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the user.',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'The first name of the user.',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'The last name of the user.',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'The email address of the user.',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The current status of the user account.',
    enum: UserStatus,
    enumName: 'UserStatus',
  })
  status: UserStatus;

  @ApiProperty({
    description: 'The timestamp when the user was created.',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The timestamp when the user was last updated.',
  })
  updatedAt: Date;
}
