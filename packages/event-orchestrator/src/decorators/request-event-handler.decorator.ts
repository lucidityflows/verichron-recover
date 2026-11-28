import { SetMetadata } from '@nestjs/common';

export const REQUEST_EVENT_HANDLER_METADATA_KEY = 'verichron:request_event_handler';

export interface RequestEventHandlerOptions {
  topicName: string;
}

export const RequestEventHandler = (topicName: string): MethodDecorator =>
  SetMetadata<string, RequestEventHandlerOptions>(REQUEST_EVENT_HANDLER_METADATA_KEY, {
    topicName,
  });
