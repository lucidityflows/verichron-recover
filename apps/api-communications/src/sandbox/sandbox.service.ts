import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../templates/templates.service';
import { TemplateRendererService } from '../templates/template-renderer.service';
import { GatewayFactoryService } from '../gateways/gateway-factory.service';
import { SandboxDispatchDto } from './dto/sandbox-dispatch.dto';
import { DispatchMethod } from '@verichron/enums';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  constructor(
    private readonly templatesService: TemplatesService,
    private readonly rendererService: TemplateRendererService,
    private readonly gatewayFactory: GatewayFactoryService,
  ) {}

  async dispatch(organizationId: string, dto: SandboxDispatchDto): Promise<any> {
    this.logger.log(`Executing Sandbox Dispatch: ${dto.method} to ${dto.to}`);

    // 1. Fetch Template (or use a simple default if name is 'RAW')
    let renderedContent: string;
    let renderedSubject: string | undefined;

    if (dto.templateName === 'RAW') {
      renderedContent = dto.context?.content || 'Test Content';
      renderedSubject = dto.context?.subject || 'Test Subject';
    } else {
      const template = await this.templatesService.findActiveByName(
        organizationId,
        dto.templateName,
      );

      if (!template) {
        // Fallback to system templates or error
        throw new NotFoundException(`Template '${dto.templateName}' not found for org ${organizationId}`);
      }

      const context = dto.context || {};
      renderedContent = this.rendererService.render(template.body, context);
      renderedSubject = template.subject
        ? this.rendererService.render(template.subject, context)
        : undefined;
    }

    // 2. Select Gateway
    const gateway = this.getGateway(dto.method);
    
    // 3. Send
    const payload = this.buildPayload(dto.method, {
      to: dto.to,
      subject: renderedSubject,
      content: renderedContent,
      organizationId,
      debtorId: 'SANDBOX-TEST-USER', // Dummy ID for gateway logs
    });

    const result = await gateway.send(payload);

    return {
      success: result.success,
      messageId: result.messageId,
      provider: result.provider || 'MOCK',
      renderedContent, // Return content so tester can see what was generated
      renderedSubject,
      error: result.error
    };
  }

  private getGateway(type: DispatchMethod): any {
    switch (type) {
      case DispatchMethod.EMAIL:
        return this.gatewayFactory.getEmailGateway();
      case DispatchMethod.SMS:
        return this.gatewayFactory.getSmsGateway();
      default:
        throw new Error(`Unsupported method: ${type}`);
    }
  }

  private buildPayload(type: DispatchMethod, data: any): any {
    switch (type) {
      case DispatchMethod.EMAIL:
        return {
          to: data.to,
          from: process.env.EMAIL_FROM_ADDRESS || 'noreply@verichroninc.com',
          subject: data.subject,
          html: data.content,
          customArgs: {
            organizationId: data.organizationId,
            debtorId: data.debtorId,
            sandbox: 'true',
          },
        };
      case DispatchMethod.SMS:
        return {
          to: data.to,
          from: process.env.SMS_FROM_NUMBER || '+15005550006',
          body: data.content,
        };
      default:
        throw new Error(`Unsupported method: ${type}`);
    }
  }
}
