import { Controller, Post, Body, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { Public } from '@verichron/auth';
import { StatusCallbackDto } from './dto/status-callback.dto';
import type { Response } from 'express';

@ApiTags('Voice Webhooks')
@Controller('public/voice/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('voice')
  @Public()
  handleVoice(@Body() body: any, @Res() res: Response) {
    const twiml = this.webhooksService.generateTwiML(body);
    res.type('text/xml');
    res.send(twiml);
  }

  @Post('status')
  @Public()
  handleStatusCallback(@Body() statusCallbackDto: StatusCallbackDto) {
    return this.webhooksService.handleStatusCallback(statusCallbackDto);
  }

  @Post('recording')
  @Public()
  handleRecordingCallback(@Body() body: any) {
    return this.webhooksService.handleRecordingCallback(body);
  }
}
