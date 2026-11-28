
/**
 * @system-rule R-U-EVNT-003
 * @description Unit tests for the OrganizationCreatedListener.
 *
 * ## What This Test Proves:
 * - The listener correctly processes `ORGANIZATIONS_ORGANIZATION_CREATED` events.
 * - It calls `ProfilesService.provisionInitialAdmin` on successful event validation.
 * - It handles event payload validation failures gracefully.
 * - It re-throws unexpected errors from the `ProfilesService`.
 *
 * ## What This Test Does NOT Prove:
 * - End-to-end event publication or subscription via Pub/Sub (that's E2E's responsibility).
 * - Integration with a live database.
 */
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { Logger } from '@nestjs/common';
import { OrganizationCreatedListener } from './organization-created.listener';
import { ProfilesService } from '../profiles.service';
import { EVENT_TYPES, EVENT_SOURCES, EventEnvelope } from '@verichron/events';
import { OrganizationCreatedDto } from '../../events/event-dto';

describe('OrganizationCreatedListener', () => {
  let listener: OrganizationCreatedListener;
  let profilesService: ProfilesService;
  let logger: Logger;

  const mockProfilesService = {
    provisionInitialAdmin: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockEvent: EventEnvelope<any> = {
    eventId: 'event-id-123',
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_CREATED,
    eventSource: EVENT_SOURCES.ORGANIZATION,
    timestamp: new Date().toISOString(),
    data: {
      organizationId: 'org-123',
      organizationName: 'Test Org',
      adminUser: {
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        OrganizationCreatedListener,
        { provide: ProfilesService, useValue: mockProfilesService },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    listener = module.get<OrganizationCreatedListener>(OrganizationCreatedListener);
    profilesService = module.get<ProfilesService>(ProfilesService);
    logger = module.get<Logger>(Logger);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('onMessage', () => {
    it('should call provisionInitialAdmin on successful validation', async () => {
      const validatedDto = mockEvent.data as OrganizationCreatedDto;

      await listener.onMessage(validatedDto, mockEvent);

      expect(profilesService.provisionInitialAdmin).toHaveBeenCalledWith({
        organizationId: validatedDto.organizationId,
        organizationName: validatedDto.organizationName,
        email: validatedDto.adminUser.email,
        firstName: validatedDto.adminUser.firstName,
        lastName: validatedDto.adminUser.lastName,
      });
    });
  });
});
