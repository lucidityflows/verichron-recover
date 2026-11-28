import { AuditHashService } from './audit-hash.service';

describe('AuditHashService', () => {
  it('computes different hashes for v1 and v2 payloads', () => {
    const service = new AuditHashService({} as never);
    const log = {
      id: 'log-1',
      organizationId: 'org-1',
      eventId: 'event-1',
      actorSnapshot: { id: 'actor-1', email: 'actor@test.com' },
      action: 'DEBT.UPDATED',
      targetType: 'DEBT',
      targetId: 'debt-1',
      changes: { amount: { from: 100, to: 90 } },
      metadata: { hashVersion: 'v2' },
      prevHash: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    } as never;

    const v1 = service.computeHash(log, 'v1');
    const v2 = service.computeHash(log, 'v2');

    expect(v1).not.toEqual(v2);
  });

  it('verifies mixed-version chains successfully', async () => {
    const genesis = {
      id: 'g',
      organizationId: 'org-1',
      eventId: 'e1',
      actorSnapshot: { id: 'a1' },
      action: 'ENTITY.CREATED',
      targetType: 'DEBT',
      targetId: 'debt-1',
      changes: null,
      metadata: null,
      prevHash: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const service = new AuditHashService({
      find: jest.fn(),
    } as never);
    const next = {
      ...genesis,
      id: 'n',
      eventId: 'e2',
      metadata: { hashVersion: 'v2' },
      prevHash: service.computeHash(genesis as never, 'v1'),
      createdAt: new Date('2026-01-01T01:00:00.000Z'),
    };

    (service as any).auditLogRepository.find.mockResolvedValue([genesis, next]);
    const result = await service.verifyChain('org-1', 'DEBT', 'debt-1');

    expect(result.valid).toBe(true);
    expect(result.brokenLinks).toHaveLength(0);
  });
});
