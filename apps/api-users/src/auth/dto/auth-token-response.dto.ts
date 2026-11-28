import { ApiProperty } from '@nestjs/swagger';
import { IAuthTokenResponse } from '@verichron/contracts';

export class AuthTokenResponseDto implements IAuthTokenResponse {
  @ApiProperty({
    description: 'The scoped access token for authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'The refresh token for obtaining a new access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}
