import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as twilio from 'twilio';
import { TwilioConfigService } from '../../twilio-config/twilio-config.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwilioWebhookMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TwilioWebhookMiddleware.name);
  private readonly appUrl: string;

  constructor(
    private readonly twilioConfigService: TwilioConfigService,
    private readonly configService: ConfigService,
  ) {
    // Priority: API_VOICE_APP_URL > APP_URL > default
    this.appUrl = 
      this.configService.get<string>('API_VOICE_APP_URL') || 
      this.configService.get<string>('APP_URL') || 
      'http://localhost:3008';
    
    if (!this.configService.get<string>('API_VOICE_APP_URL') && !this.configService.get<string>('APP_URL')) {
      this.logger.warn(`Neither API_VOICE_APP_URL nor APP_URL is set. Using default: ${this.appUrl}`);
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const signature = req.header('X-Twilio-Signature');
    if (!signature) {
      this.logger.warn('Twilio webhook request missing X-Twilio-Signature header');
      throw new UnauthorizedException('Missing Twilio signature');
    }

    const accountSid = req.body.AccountSid;
    if (!accountSid) {
      this.logger.warn('Twilio webhook request missing AccountSid in body');
      throw new UnauthorizedException('Missing AccountSid');
    }

    const twilioConfig = await this.twilioConfigService.findByAccountSid(accountSid);

    if (!twilioConfig) {
      this.logger.error(`Could not find Twilio config for AccountSid: ${accountSid}`);
      throw new UnauthorizedException('Invalid Twilio credentials');
    }

    // IMPORTANT: Twilio validation requires the raw, unparsed body.
    // This middleware must be used with a route where the body is not parsed by NestJS.
    // This is typically done by using the `raw-body` parser or by configuring
    // the main.ts to provide the raw body.
    const url = `${this.appUrl}${req.originalUrl}`;

    const isValid = twilio.validateRequestWithBody(
      twilioConfig.authToken, // Decrypted auth token
      signature,
      url,
      (req as any).rawBody, // Requires rawBody to be populated
    );

    if (!isValid) {
      this.logger.error(`Invalid Twilio signature for AccountSid: ${accountSid}`);
      throw new UnauthorizedException('Invalid Twilio signature');
    }

    next();
  }
}

