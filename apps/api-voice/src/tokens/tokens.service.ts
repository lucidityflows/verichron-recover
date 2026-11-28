import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { TwilioConfigService } from '../twilio-config/twilio-config.service';
import type { TwilioConfig } from '../twilio-config/entities/twilio-config.entity'; // Import TwilioConfig type
import { RequestContext } from '../core';
import * as Twilio from 'twilio';

@Injectable()
export class TokensService {
  constructor(
    private readonly twilioConfigService: TwilioConfigService,
    private readonly requestContext: RequestContext,
  ) {}

  async generateToken(organizationId: string): Promise<{ token: string }> {
    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new InternalServerErrorException('User ID not found in request context.');
    }

    const config = (await this.twilioConfigService.findOne(organizationId)) as TwilioConfig;

    const AccessToken = Twilio.jwt.AccessToken;
    const { VoiceGrant } = AccessToken;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: config.outgoingApplicationSid,
      incomingAllow: true, // Allow incoming calls for potential transfers or direct calls
    });

    const token = new AccessToken(
      config.accountSid,
      config.apiKeySid,
      config.apiKeySecret, // This is the decrypted secret
      {
        identity: userId, // Unique identity for the Twilio client
      },
    );

    token.addGrant(voiceGrant);

    return { token: token.toJwt() };
  }
}
