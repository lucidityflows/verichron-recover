import { AuditsService } from './audits.service';

describe('AuditsService', () => {
  const buildQueryBuilder = (result: unknown[] = []) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([result, result.length]),
    getMany: jest.fn().mockResolvedValue(result),
    getCount: jest.fn().mockResolvedValue(result.length),
  });

  it('forces JSON format and persists pending request', async () => {
    const dataSource = { query: jest.fn().mockResolvedValue([]) };
    const auditLogRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(buildQueryBuilder()),
    };
    const saved = {
      id: 'request-1',
      organizationId: 'org-1',
      requestType: 'CUSTOM',
      status: 'PENDING',
      format: 'JSON',
      filters: {},
      requestedBy: { id: 'actor-1' },
      createdAt: new Date(),
      retryCount: 0,
    };
    const auditRequestRepository = {
      create: jest.fn().mockImplementation((input) => input),
      save: jest.fn().mockResolvedValue(saved),
      findOneOrFail: jest.fn().mockResolvedValue(saved),
      findOne: jest.fn().mockResolvedValue(saved),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuditsService(
      auditLogRepository as never,
      auditRequestRepository as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.createRequest(
      'org-1',
      { id: 'actor-1', email: 'actor@test.com' } as never,
      { format: 'CSV', requestType: 'CUSTOM' },
    );

    expect(auditRequestRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'JSON',
        status: 'PENDING',
      }),
    );
  });

  it('marks failed requests on processing errors', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const auditLogRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const auditRequestRepository = {
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue({
        id: 'request-2',
        organizationId: 'org-1',
        status: 'PENDING',
        retryCount: 0,
        startedAt: new Date(),
      }),
    };

    const service = new AuditsService(
      auditLogRepository as never,
      auditRequestRepository as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await (service as any).processRequest('request-2');

    expect(auditRequestRepository.update).toHaveBeenCalledWith(
      'request-2',
      expect.objectContaining({
        status: 'FAILED',
      }),
    );
  });
});
