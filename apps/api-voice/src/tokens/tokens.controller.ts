import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import { OrganizationId, Permissions } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Voice Tokens')
@ApiBearerAuth()
@Controller('voice/token')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get()
  @Permissions(OrganizationPermission.VOICE_CALL)
  @ApiOperation({ summary: 'Generate a Twilio capability token for the client-side softphone' })
  generateToken(@OrganizationId() organizationId: string) {
    // We will need the user's ID to create a unique identity for the Twilio client
    // This will be retrieved from the request context in the service.
    return this.tokensService.generateToken(organizationId);
  }
}
