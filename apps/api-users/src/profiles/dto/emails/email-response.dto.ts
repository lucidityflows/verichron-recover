import { ApiProperty } from "@nestjs/swagger";
import { IUserEmailResponse } from '@verichron/contracts';

export class EmailResponseDto implements IUserEmailResponse {
  @ApiProperty({ 
    description: 'The unique identifier for the email record.', 
    format: 'uuid' 
  })
  id: string;

  @ApiProperty({ 
    description: 'The email address.', 
    example: 'john.doe@personal.com' 
  })
  email: string;

  @ApiProperty({ 
    description: 'Indicates if this is the user\'s primary email.' 
  })
  isPrimary: boolean;

  @ApiProperty({ 
    description: 'The timestamp when the email was created.' 
  })
  createdAt: Date;
}