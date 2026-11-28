import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallLog } from '../calls/entities/call-log.entity';
import { StatusCallbackDto } from './dto/status-callback.dto';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { VoiceCallCompletedDto, VoiceCallRecordingReadyDto } from '../events/event-dto';
import { CallStatus } from '@verichron/enums';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(CallLog)
    private readonly callLogRepository: Repository<CallLog>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  generateTwiML(body: any): string {
    const twiml = new VoiceResponse();
    // This TwiML can be expanded later for more complex IVR or call flows.
    // For now, it just dials the number.
    const dial = twiml.dial({
      callerId: body.From, // This should be the organization's verified number
    });
    dial.number(body.To);
    return twiml.toString();
  }

  async handleStatusCallback(statusCallbackDto: StatusCallbackDto): Promise<void> {
    this.logger.log(`Received status callback for CallSid: ${statusCallbackDto.CallSid}, Status: ${statusCallbackDto.CallStatus}`);

    const callLog = await this.callLogRepository.findOne({
      where: { providerSid: statusCallbackDto.CallSid },
    });

    if (!callLog) {
      this.logger.warn(`Could not find CallLog for CallSid: ${statusCallbackDto.CallSid}`);
      return;
    }

    callLog.status = statusCallbackDto.CallStatus;
    if (statusCallbackDto.CallDuration) {
      callLog.duration = parseInt(statusCallbackDto.CallDuration, 10);
    }

    await this.callLogRepository.save(callLog);

    if (callLog.status === CallStatus.COMPLETED) {
      await this.eventPublisher.publish(
        EVENT_TYPES.VOICE_VOICE_CALL_COMPLETED,
        {
          callSid: callLog.providerSid,
          organizationId: callLog.organizationId,
          debtorId: callLog.debtorId,
          agentId: callLog.agentId,
          duration: callLog.duration,
        },
        VoiceCallCompletedDto,
      );
    }
  }

  async handleRecordingCallback(body: any): Promise<void> {
    this.logger.log(`Received recording callback for CallSid: ${body.CallSid}`);

    const callLog = await this.callLogRepository.findOne({
      where: { providerSid: body.CallSid },
    });

    if (!callLog) {
      this.logger.warn(`Could not find CallLog for CallSid: ${body.CallSid}`);
      return;
    }

    callLog.recordingUrl = body.RecordingUrl;
    await this.callLogRepository.save(callLog);

    await this.eventPublisher.publish(
      EVENT_TYPES.VOICE_VOICE_CALL_RECORDING_READY,
      {
        callSid: callLog.providerSid,
        organizationId: callLog.organizationId,
        debtorId: callLog.debtorId,
        recordingUrl: callLog.recordingUrl,
      },
      VoiceCallRecordingReadyDto,
    );
  }
}
