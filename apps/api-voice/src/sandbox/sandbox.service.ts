import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { TwilioConfigService } from '../twilio-config/twilio-config.service';
import type { TwilioConfig } from '../twilio-config/entities/twilio-config.entity';
import { SandboxCallDto } from './dto/sandbox-call.dto';
import * as Twilio from 'twilio';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  constructor(
    private readonly twilioConfigService: TwilioConfigService,
  ) {}

  async initiateCall(organizationId: string, dto: SandboxCallDto): Promise<any> {
    this.logger.log(`Executing Sandbox Call to ${dto.toNumber}`);

    const config = (await this.twilioConfigService.findOne(organizationId)) as TwilioConfig;
    if (!config) {
        throw new InternalServerErrorException('Twilio config not found for this organization');
    }
    
    const twilioClient = new Twilio.Twilio(config.accountSid, config.authToken);

    // Default "From" number (Magic Number for testing)
    const fromNumber = process.env.TWILIO_VOICE_NUMBER || '+15005550006'; 

    // Generate TwiML for the test message
    // If we want a real call, we can point to a URL. 
    // For sandbox, we can use TwiML directly or a TwiML Bin URL.
    // Twilio.calls.create doesn't support inline TwiML directly, it needs a URL.
    // However, we can use a data URI or a simple echo service.
    // For now, let's assume we have a generic webhook or just log it if mocking.
    
    // In a real implementation, we would point to:
    // url: `${process.env.API_BASE_URL}/voice/webhooks/sandbox-twiml?message=${encodeURIComponent(dto.message)}`
    
    // For this MVP step, we will use the standard demo URL if no message, or log the intention.
    const url = 'http://demo.twilio.com/docs/voice.xml';

    try {
        const call = await twilioClient.calls.create({
            to: dto.toNumber,
            from: fromNumber,
            url: url, 
        });

        return {
            sid: call.sid,
            status: call.status,
            direction: call.direction,
            from: fromNumber,
            to: dto.toNumber
        };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Twilio Call Failed: ${msg}`);
        // Return error details for the UI to display
        return {
            success: false,
            error: msg
        };
    }
  }
}
