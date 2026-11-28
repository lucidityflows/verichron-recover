// test/unit/dispatch.service.spec.ts
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { DispatchService, DispatchRequest } from '../../src/dispatch/dispatch.service';
import { TemplatesService } from '../../src/templates/templates.service';
import { ComplianceService } from '../../src/compliance/compliance.service';
import { GatewayFactoryService } from '../../src/gateways/gateway-factory.service';
import { LogsService } from '../../src/logs/logs.service';
import { EventPublisher } from '@verichron/event-publisher';
import { TemplateRendererService } from '../../src/templates/template-renderer.service';
import { ComplianceViolationException } from '../../src/dispatch/errors/compliance-violation.exception';
import { TemplateNotFoundException } from '../../src/templates/errors/template-not-found.exception';
import { DispatchMethod } from '@verichron/enums';

describe('DispatchService', () => {
  let service: DispatchService;
  let templatesService: jest.Mocked<TemplatesService>;
  let complianceService: jest.Mocked<ComplianceService>;
  let gatewayFactory: jest.Mocked<GatewayFactoryService>;
  let logsService: jest.Mocked<LogsService>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let templateRenderer: jest.Mocked<TemplateRendererService>;

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        DispatchService,
        {
          provide: TemplatesService,
          useValue: {
            findActiveByName: jest.fn(),
          },
        },
        {
          provide: ComplianceService,
          useValue: {
            checkCompliance: jest.fn(),
          },
        },
        {
          provide: GatewayFactoryService,
          useValue: {
            getEmailGateway: jest.fn(),
            getSmsGateway: jest.fn(),
          },
        },
        {
          provide: LogsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: TemplateRendererService,
          useValue: {
            render: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DispatchService>(DispatchService);
    templatesService = module.get(TemplatesService);
    complianceService = module.get(ComplianceService);
    gatewayFactory = module.get(GatewayFactoryService);
    logsService = module.get(LogsService);
    eventPublisher = module.get(EventPublisher);
    templateRenderer = module.get(TemplateRendererService);
  });

  describe('dispatch', () => {
    it('should successfully dispatch email when all checks pass', async () => {
      // Arrange
      const request: DispatchRequest = {
        organizationId: 'org-123',
        debtorId: 'debtor-456',
        communicationType: DispatchMethod.EMAIL,
        templateName: 'payment-receipt',
        context: {
          debtor: { email: 'test@example.com', firstName: 'John' },
          payment: { amount: 100 },
        },
      };

      complianceService.checkCompliance.mockResolvedValue({
        allowed: true,
      });

      templatesService.findActiveByName.mockResolvedValue({
        id: 'template-789',
        name: 'payment-receipt',
        type: 'EMAIL',
        subject: 'Payment Receipt',
        body: 'Thank you {{debtor.firstName}}',
        version: 1,
      } as any);

      const mockGateway = {
        send: jest.fn().mockResolvedValue({
          success: true,
          messageId: 'msg-abc',
        }),
      };
      gatewayFactory.getEmailGateway.mockReturnValue(mockGateway);

      logsService.create.mockResolvedValue({
        _id: 'log-xyz',
        toString: () => 'log-xyz'
      } as any);

      // Act
      const result = await service.dispatch(request);

      // Assert
      expect(result).toBe('log-xyz');
      expect(complianceService.checkCompliance).toHaveBeenCalledWith(expect.objectContaining({
        debtorId: 'debtor-456',
        organizationId: 'org-123',
      }));
      expect(templatesService.findActiveByName).toHaveBeenCalledWith(
        'org-123',
        'payment-receipt'
      );
      expect(mockGateway.send).toHaveBeenCalled();
      expect(logsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123',
          debtorId: 'debtor-456',
        })
      );
      expect(eventPublisher.publish).toHaveBeenCalled();
    });

    it('should throw ComplianceViolationException when compliance check fails', async () => {
      // Arrange
      const request: DispatchRequest = {
        organizationId: 'org-123',
        debtorId: 'debtor-456',
        communicationType: DispatchMethod.EMAIL,
        templateName: 'payment-receipt',
        context: {},
      };

      complianceService.checkCompliance.mockResolvedValue({
        allowed: false,
        reason: 'Debtor opted out of email communications',
      });

      logsService.create.mockResolvedValue({
        _id: 'log-xyz',
        toString: () => 'log-xyz'
      } as any);

      // Act & Assert
      await expect(service.dispatch(request)).rejects.toThrow(
        ComplianceViolationException
      );
      expect(templatesService.findActiveByName).not.toHaveBeenCalled();
      expect(logsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'BLOCKED',
          blockedReason: 'Debtor opted out of email communications',
        })
      );
    });

    it('should throw TemplateNotFoundException when template does not exist', async () => {
      // Arrange
      const request: DispatchRequest = {
        organizationId: 'org-123',
        debtorId: 'debtor-456',
        communicationType: DispatchMethod.EMAIL,
        templateName: 'non-existent-template',
        context: {},
      };

      complianceService.checkCompliance.mockResolvedValue({
        allowed: true,
      });

      templatesService.findActiveByName.mockResolvedValue(null as any);

      // Act & Assert
      await expect(service.dispatch(request)).rejects.toThrow(
        TemplateNotFoundException
      );
    });

    it('should retry on gateway timeout and eventually succeed', async () => {
      // Arrange
      const request: DispatchRequest = {
        organizationId: 'org-123',
        debtorId: 'debtor-456',
        communicationType: DispatchMethod.EMAIL,
        templateName: 'payment-receipt',
        context: { debtor: { email: 'test@example.com' } },
      };

      complianceService.checkCompliance.mockResolvedValue({ allowed: true });
      templatesService.findActiveByName.mockResolvedValue({
        id: 'template-789',
        body: 'Test',
      } as any);

      const mockGateway = {
        send: jest
          .fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValueOnce({
            success: true,
            messageId: 'msg-abc',
          }),
      };
      gatewayFactory.getEmailGateway.mockReturnValue(mockGateway);
      
      logsService.create.mockResolvedValue({
        _id: 'log-xyz',
        toString: () => 'log-xyz'
      } as any);

      // Act
      const result = await service.dispatch(request);

      // Assert
      expect(result).toBe('log-xyz');
      expect(mockGateway.send).toHaveBeenCalledTimes(2);
    });
  });
});
