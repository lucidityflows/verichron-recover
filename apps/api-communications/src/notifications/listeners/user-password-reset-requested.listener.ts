import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { PasswordResetRequestedDto } from '../../events/event-dto/users/password-reset-requested.dto';
import { TemplatesService } from '../../templates/templates.service';
import { TemplateRendererService } from '../../templates/template-renderer.service';
import { GatewayFactoryService } from '../../gateways/gateway-factory.service';

@Injectable()
export class UserPasswordResetRequestedListener extends AbstractBaseListener<PasswordResetRequestedDto> {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly rendererService: TemplateRendererService,
    private readonly gatewayFactory: GatewayFactoryService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.USERS,
    eventType: EVENT_TYPES.USERS_AUTH_PASSWORD_RESET_REQUESTED,
    dto: PasswordResetRequestedDto,
  })
  async handlePasswordResetRequested(
    data: PasswordResetRequestedDto,
    envelope: EventEnvelope<PasswordResetRequestedDto>,
  ): Promise<void> {
    this.logger.log(`Handling PASSWORD_RESET_REQUESTED event for user ${data.userId}`);

    // 1. Fetch Template (always use system template for password reset)
    const templateName = 'PASSWORD_RESET';
    let template;

    try {
      template = await this.templatesService.findActiveByName(
        '00000000-0000-0000-0000-000000000000',
        templateName,
      );
    } catch (e) {
      this.logger.error(
        `Required template ${templateName} not found in SYSTEM context. Password reset email cannot be sent.`,
      );
      return;
    }

    // 2. Render Content
    const resetBaseUrl = (process.env.PASSWORD_RESET_BASE_URL || 'http://localhost:5173/reset-password').trim();

    // Format expiration date for American timezone display
    const expiresAtDate = new Date(data.resetTokenExpiresAt);
    const formattedExpiresAt = expiresAtDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: 'America/New_York',
    });

    // We need the user's first name - extract from email or use generic greeting
    // Since we don't have firstName in the payload, we'll use a generic greeting
    const context = {
      user: {
        firstName: 'User', // Generic since we don't have the name in the payload
        email: data.email,
      },
      reset: {
        token: data.resetToken,
        expiresAt: formattedExpiresAt,
        link: `${resetBaseUrl.replace(/\/$/, '')}/${data.resetToken}`,
      },
    };

    const renderedBody = this.rendererService.render(template.body, context as any);
    const renderedSubject = template.subject
      ? this.rendererService.render(template.subject, context as any)
      : 'Reset Your Verichron Password';

    // 3. Send Email
    const emailGateway = this.gatewayFactory.getEmailGateway();

    const payload = {
      to: data.email,
      from: process.env.EMAIL_FROM_ADDRESS || 'noreply@verichroninc.com',
      subject: renderedSubject,
      html: renderedBody,
      customArgs: {
        userId: data.userId,
        notificationType: 'PASSWORD_RESET',
      },
    };

    const result = await emailGateway.send(payload);

    if (result.success) {
      this.logger.log(`Password reset email sent to ${data.email} (Message ID: ${result.messageId})`);
    } else {
      const errorMessage = result.error || 'Unknown error';

      // Detect permanent errors that should NOT be retried
      const isPermanentError =
        errorMessage.includes('Forbidden') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('Bad Request') ||
        errorMessage.includes('403') ||
        errorMessage.includes('401') ||
        errorMessage.includes('400');

      if (isPermanentError) {
        this.logger.error(
          `PERMANENT FAILURE: Could not send password reset email to ${data.email}. Stopping retries. Error: ${errorMessage}`,
        );
        return;
      }

      this.logger.error(`Failed to send password reset email to ${data.email}: ${errorMessage}`);
      throw new Error(`Email dispatch failed: ${errorMessage}`);
    }
  }
}
