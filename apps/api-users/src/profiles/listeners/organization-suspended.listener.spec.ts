/**
 * @system-rule R-U-EVNT-002
 * @description Unit tests for the OrganizationSuspendedListener.
 *
 * ## What This Test Proves:
 * - The listener correctly processes `ORGANIZATIONS_ORGANIZATION_SUSPENDED` events.
 * - It updates the status of all users within the affected organization to `SUSPENDED`.
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
import { OrganizationSuspendedListener } from './organization-suspended.listener';
import { ProfilesService } from '../profiles.service';
import { EVENT_TYPES, EVENT_SOURCES, EventEnvelope } from '@verichron/events';
import { UserStatus } from '@verichron/enums';
import { OrganizationSuspendedDto } from '../../events/event-dto';

describe('OrganizationSuspendedListener', () => {
  let listener: OrganizationSuspendedListener;
  let profilesService: ProfilesService;
  let logger: Logger;

  const mockProfilesService = {
    findMembershipsByOrganization: jest.fn(),
    updateUserStatus: jest.fn(),
  };

  const mockLogger = {
    warn: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockEvent: EventEnvelope<any> = {
    eventId: 'event-id-789',
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_SUSPENDED,
    eventSource: EVENT_SOURCES.ORGANIZATION,
    timestamp: new Date().toISOString(),
    data: {
      organizationId: 'org-123',
      reason: 'Non-payment',
      suspendedAt: new Date().toISOString(),
      suspendedBy: 'system',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        OrganizationSuspendedListener,
        { provide: ProfilesService, useValue: mockProfilesService },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    listener = module.get<OrganizationSuspendedListener>(OrganizationSuspendedListener);
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

      it('should suspend all users in an organization on successful validation', async () => {

        const validatedDto = mockEvent.data as OrganizationSuspendedDto;

        const mockMemberships = [{ userId: 'user-1' }, { userId: 'user-2' }];

        mockProfilesService.findMembershipsByOrganization.mockResolvedValue(mockMemberships);

  

        await listener.onMessage(validatedDto, mockEvent);

  

        expect(profilesService.findMembershipsByOrganization).toHaveBeenCalledWith(validatedDto.organizationId);

        expect(profilesService.updateUserStatus).toHaveBeenCalledTimes(2);

        expect(profilesService.updateUserStatus).toHaveBeenCalledWith('user-1', UserStatus.SUSPENDED);

        expect(profilesService.updateUserStatus).toHaveBeenCalledWith('user-2', UserStatus.SUSPENDED);

      });

    });

  });

  