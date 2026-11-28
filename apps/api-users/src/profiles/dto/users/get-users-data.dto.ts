import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class GetUsersDataDto {
  @ApiProperty({
    description: 'Array of User IDs to fetch',
    example: ['a1b2c3d4-e5f6-4789-a012-3456789abcde'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];
}
