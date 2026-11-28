import { Injectable, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallLog } from './entities/call-log.entity';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { TwilioConfigService } from '../twilio-config/twilio-config.service';
import type { TwilioConfig } from '../twilio-config/entities/twilio-config.entity'; // Import TwilioConfig type
import { RequestContext } from '../core';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { VoiceCallStartedDto } from '../events/event-dto';
import * as Twilio from 'twilio';
import { CommunicationsService } from '../shared/services/communications.service';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(CallLog)
    private readonly callLogRepository: Repository<CallLog>,
    private readonly twilioConfigService: TwilioConfigService,
    private readonly requestContext: RequestContext,
    private readonly eventPublisher: EventPublisher,
    private readonly communicationsService: CommunicationsService,
  ) {}

  async initiateCall(
    organizationId: string,
    initiateCallDto: InitiateCallDto,
  ): Promise<{ callSid: string }> {
    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new InternalServerErrorException('User ID not found in request context.');
    }

    // DNC Check
    const isDnc = await this.communicationsService.isDnc(initiateCallDto.debtorId, organizationId);
    if (isDnc) {
      throw new ForbiddenException('This debtor has a Do Not Call flag and cannot be contacted.');
    }

    const config = (await this.twilioConfigService.findOne(organizationId)) as TwilioConfig;
    const twilioClient = new Twilio.Twilio(config.accountSid, config.authToken);

    // TODO: Look up the organization's verified "from" number
    const fromNumber = '+15005550006'; // Placeholder

    const call = await twilioClient.calls.create({
      to: initiateCallDto.phoneNumber,
      from: fromNumber,
      // URL that provides TwiML instructions for the call
      url: `https://your-app-url.com/voice/webhooks/voice`,
      // URL to receive status updates
      statusCallback: `https://your-app-url.com/voice/webhooks/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['queued', 'ringing', 'answered', 'completed'],
    });

    // Create and save a log of the call attempt
    const callLog = this.callLogRepository.create({
      organizationId,
      debtorId: initiateCallDto.debtorId,
      agentId: userId,
      providerSid: call.sid,
      fromNumber,
      toNumber: initiateCallDto.phoneNumber,
    });
    await this.callLogRepository.save(callLog);

    // Publish event
    await this.eventPublisher.publish(
      EVENT_TYPES.VOICE_VOICE_CALL_STARTED,
      {
        callSid: call.sid,
        organizationId,
        debtorId: initiateCallDto.debtorId,
        agentId: userId,
      },
      VoiceCallStartedDto,
    );

    return { callSid: call.sid };
  }

  async getCallHistory(organizationId: string, debtorId: string): Promise<CallLog[]> {
    return this.callLogRepository.find({
      where: { organizationId, debtorId },
      order: { createdAt: 'DESC' },
    });
  }
}
