// Mock for @verichron/event-publisher
export class EventPublisher {
  publish = jest.fn().mockResolvedValue(undefined);
}
