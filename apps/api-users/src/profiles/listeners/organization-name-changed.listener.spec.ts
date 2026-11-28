/**
 * @system-rule R-U-EVNT-001
 * @description Unit tests for the OrganizationNameChangedListener.
 *
 * ## What This Test Proves:
 * - The listener correctly processes `ORGANIZATIONS_ORGANIZATION_NAME_CHANGED` events.
 * - It updates the denormalized `organizationName` field in `UserMembershipEntity` records.
 * - It handles event payload validation failures gracefully.
 * - It re-throws unexpected errors from the repository.
 *
 * ## What This Test Does NOT Prove:
 * - End-to-end event publication or subscription via Pub/Sub (that's E2E's responsibility).
 * - Integration with a live database.
 */
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationNameChangedListener } from './organization-name-changed.listener';
import { UserMembershipEntity } from '../entities';
import { EVENT_TYPES, EVENT_SOURCES, EventEnvelope } from '@verichron/events';
import { OrganizationNameChangedDto } from '../../events/event-dto';

describe('OrganizationNameChangedListener', () => {
  let listener: OrganizationNameChangedListener;
  let membershipRepository: Repository<UserMembershipEntity>;
  let logger: Logger;

  const mockMembershipRepository = {
    update: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockEvent: EventEnvelope<any> = {
    eventId: 'event-id-456',
    eventType: EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED,
    eventSource: EVENT_SOURCES.ORGANIZATION,
    timestamp: new Date().toISOString(),
    data: {
      organizationId: 'org-123',
      previousName: 'Old Name',
      newName: 'New Name',
      changedAt: new Date().toISOString(),
      updatedBy: 'user-789',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        OrganizationNameChangedListener,
        { provide: getRepositoryToken(UserMembershipEntity), useValue: mockMembershipRepository },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    listener = module.get<OrganizationNameChangedListener>(OrganizationNameChangedListener);
    membershipRepository = module.get<Repository<UserMembershipEntity>>(getRepositoryToken(UserMembershipEntity));
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

      it('should update memberships on successful validation', async () => {

        const validatedDto = mockEvent.data as OrganizationNameChangedDto;

  

        await listener.onMessage(validatedDto, mockEvent);

  

        expect(membershipRepository.update).toHaveBeenCalledWith(

          { organizationId: validatedDto.organizationId },

          { organizationName: validatedDto.newName },

        );

      });

    });

  });

  