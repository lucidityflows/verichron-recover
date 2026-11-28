/**
 * @system-rule R-EVENT-001
 * @description The event bus infrastructure must reliably publish and receive messages across topics.
 */
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES, EventSource, UserCreatedPayload } from '@verichron/events';
import { createEventListenerHelper, EventListenerHelper } from '../helpers/event-listener.helper';
import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisherModule } from '@verichron/event-publisher';
import { randomUUID } from 'crypto';
import { UserCreatedDto } from '../../apps/api-users/src/events/event-dto';

describe('Eventing Proof of Concept (e2e)', () => {
  let eventListener: EventListenerHelper;
  let eventPublisher: EventPublisher;
  let app: TestingModule;

  beforeAll(async () => {
    // Create a NestJS testing module to get an instance of EventPublisher
    app = await Test.createTestingModule({
      imports: [
        EventPublisherModule.forRoot({
          projectId: process.env.PUBSUB_PROJECT_ID || 'test-project',
          emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
          serviceName: EVENT_SOURCES.TEST,
        }),
      ],
    }).compile();

    eventPublisher = app.get<EventPublisher>(EventPublisher);

    // Create the event listener helper
    eventListener = await createEventListenerHelper();
    await eventListener.startListening(EVENT_TOPICS.USERS);
  });

  afterAll(async () => {
    await eventListener.stopAll();
    await app.close();
  });

  beforeEach(() => {
    eventListener.clearEvents();
  });

  it('should publish and receive a UserCreated event', async () => {
    const userId = randomUUID();
    const organizationId = randomUUID();
    const correlationId = randomUUID();

    const payload: UserCreatedPayload = {
      userId,
      organizationId,
      email: 'test-user@example.com',
      firstName: 'Test',
      lastName: 'User',
      invitationToken: 'some-token',
      invitationExpiresAt: new Date().toISOString(),
      roleId: randomUUID(),
      createdBy: null,
    };

    // Publish the event
    await eventPublisher.publish(
      EVENT_TYPES.USERS_USER_CREATED,
      payload,
      UserCreatedDto,
      { correlationId, topic: EVENT_TOPICS.USERS },
    );

    // Wait for the event to be received by the listener
    const receivedEvent = await eventListener.waitForEvent(
      EVENT_TYPES.USERS_USER_CREATED,
      { correlationId, timeout: 5000 },
    );

    // Assertions
    expect(receivedEvent).toBeDefined();
    expect(receivedEvent.eventType).toBe(EVENT_TYPES.USERS_USER_CREATED);
    expect(receivedEvent.topic).toBe(EVENT_TOPICS.USERS);
    expect(receivedEvent.correlationId).toBe(correlationId);
    expect(receivedEvent.payload).toEqual(payload);
  });
});
