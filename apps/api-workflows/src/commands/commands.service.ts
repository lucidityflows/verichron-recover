import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { WorkflowAction } from '@verichron/contracts';
import { 
  type EventSource, 
  type EventType, 
  type EventTopic, 
  EVENT_SOURCES, 
  EVENT_TOPICS, 
  EVENT_TYPES } 
from '@verichron/events';
import {
  WorkQueueItemAssignedDto,
  EscalateToManagerDto,
  SendEmailCommandDto,
  SendNotificationCommandDto,
  UpdatePriorityDto,
  AddToQueueDto,
  CreateTaskDto,
  ExternalWebhookTriggeredDto,
} from '../events/event-dto';
import { WorkflowActionType } from '@verichron/enums';

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

  constructor(private readonly eventPublisher: EventPublisher) {}

  async publishCommand(
    organizationId: string,
    action: WorkflowAction,
    targetEntityId: string,
    targetEntityType: string,
    eventPayload: any,
  ): Promise<void> {
    const correlationId = eventPayload?.correlationId || eventPayload?.id || `workflow-action-${Date.now()}`;

    let topic: EventTopic;
    let eventType: EventType;
    let data: any;
    let eventSource: EventSource;

    switch (action.type) {
      case WorkflowActionType.ASSIGN_TO_COLLECTOR:
      case WorkflowActionType.REASSIGN_TO_COLLECTOR:
        topic = EVENT_TOPICS.COLLECTORS;
        eventType = EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED;
        eventSource = EVENT_SOURCES.WORKFLOWS;
        data = {
          organizationId,
          collectorId: action.config.collectorId,
          targetEntityId,
          targetEntityType,
          reason: `Workflow action: ${action.type}`,
        };
        break;
      case WorkflowActionType.ESCALATE_TO_MANAGER:
        topic = EVENT_TOPICS.COLLECTORS;
        eventType = EVENT_TYPES.COLLECTORS_WORKFLOW_COMMAND_ESCALATE_TO_MANAGER; 
        eventSource = EVENT_SOURCES.WORKFLOWS;
        data = {
          organizationId,
          managerId: action.config.managerId,
          targetEntityId,
          targetEntityType,
          reason: `Workflow action: ${action.type}`,
          escalationDetails: action.config.details,
        };
        break;
      case WorkflowActionType.SEND_EMAIL:
        topic = EVENT_TOPICS.COMMUNICATIONS;
        eventType = EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL;
        eventSource = EVENT_SOURCES.WORKFLOWS;
        data = {
          organizationId,
          recipient: action.config.recipient,
          templateId: action.config.templateId,
          context: action.config.context,
          targetEntityId,
          targetEntityType,
        };
        break;
      case WorkflowActionType.SEND_NOTIFICATION:
        topic = EVENT_TOPICS.COMMUNICATIONS;
        eventType = EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_NOTIFICATION;
        eventSource = EVENT_SOURCES.WORKFLOWS;
        data = {
          organizationId,
          userId: action.config.userId,
          message: action.config.message,
          targetEntityId,
          targetEntityType,
        };
        break;
      case WorkflowActionType.UPDATE_PRIORITY:
        topic = EVENT_TOPICS.DEBTS;
        eventType = EVENT_TYPES.DEBTS_WORKFLOW_COMMAND_UPDATE_PRIORITY; 
        eventSource = EVENT_SOURCES.WORKFLOWS;
        data = {
          organizationId,
          targetEntityId,
          targetEntityType,
          newPriority: action.config.priority,
        };
        break;
      case WorkflowActionType.ADD_TO_QUEUE:
        topic = EVENT_TOPICS.COLLECTORS;
        eventType = EVENT_TYPES.COLLECTORS_WORKFLOW_COMMAND_ADD_TO_QUEUE; 
        eventSource = EVENT_SOURCES.WORKFLOWS;
        data = {
          organizationId,
          queueId: action.config.queueId,
          targetEntityId,
          targetEntityType,
        };
        break;
      case WorkflowActionType.CREATE_TASK:
        topic = EVENT_TOPICS.COLLECTORS;
        eventType = EVENT_TYPES.COLLECTORS_WORKFLOW_COMMAND_CREATE_TASK; 
        eventSource = EVENT_SOURCES.WORKFLOWS;
        data = {
          organizationId,
          assigneeId: action.config.assigneeId,
          taskType: action.config.taskType,
          dueDate: action.config.dueDate,
          targetEntityId,
          targetEntityType,
        };
        break;
      case WorkflowActionType.TRIGGER_WEBHOOK:
        topic = EVENT_TOPICS.WORKFLOWS;
        eventType = EVENT_TYPES.WORKFLOWS_EXTERNAL_WEBHOOK_TRIGGERED; // NEED TO DEFINE THIS EVENT in packages/events
        eventSource = EVENT_SOURCES.WORKFLOWS;
        data = {
          organizationId,
          webhookUrl: action.config.url,
          payload: action.config.payload,
          targetEntityId,
          targetEntityType,
        };
        break;
      default:
        this.logger.warn(`Unknown workflow action type: ${action.type}. No command published.`);
        return;
    }

    this.logger.debug(`Publishing command ${eventType} with correlationId ${correlationId}`);
    
    const dtoClassMap: Record<string, any> = {
      [EVENT_TYPES.COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED]: WorkQueueItemAssignedDto,
      [EVENT_TYPES.COLLECTORS_WORKFLOW_COMMAND_ESCALATE_TO_MANAGER]: EscalateToManagerDto,
      [EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL]: SendEmailCommandDto,
      [EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_NOTIFICATION]: SendNotificationCommandDto,
      [EVENT_TYPES.DEBTS_WORKFLOW_COMMAND_UPDATE_PRIORITY]: UpdatePriorityDto,
      [EVENT_TYPES.COLLECTORS_WORKFLOW_COMMAND_ADD_TO_QUEUE]: AddToQueueDto,
      [EVENT_TYPES.COLLECTORS_WORKFLOW_COMMAND_CREATE_TASK]: CreateTaskDto,
      [EVENT_TYPES.WORKFLOWS_EXTERNAL_WEBHOOK_TRIGGERED]: ExternalWebhookTriggeredDto,
    };

    const dtoClass = dtoClassMap[eventType];

    await this.eventPublisher.publish(
      eventType,
      data,
      dtoClass,
      { correlationId },
    );
  }
}