import {
  WorkflowTriggerType,
  WorkflowConditionOperator,
  WorkflowActionType,
  WorkflowPriority,
} from '@verichron/enums';

export const STANDARD_WORKFLOW_TEMPLATES = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Standard Dunning Sequence',
    description: 'Automated email sequence for newly created debts. Sends initial contact email, followed by reminder emails at 7 and 14 days if no payment received.',
    category: 'compliance',
    triggerType: WorkflowTriggerType.DEBT_CREATED,
    defaultConditions: [],
    defaultActions: [
      {
        id: 'action-1',
        type: WorkflowActionType.SEND_EMAIL,
        order: 1,
        config: {
          templateId: 'initial-contact',
          recipient: 'DEBTOR',
          delayDays: 0
        }
      },
      {
        id: 'action-2',
        type: WorkflowActionType.SEND_EMAIL,
        order: 2,
        config: {
          templateId: '7-day-reminder',
          recipient: 'DEBTOR',
          delayDays: 7
        }
      },
      {
        id: 'action-3',
        type: WorkflowActionType.SEND_EMAIL,
        order: 3,
        config: {
          templateId: '14-day-reminder',
          recipient: 'DEBTOR',
          delayDays: 14
        }
      }
    ],
    defaultPriority: WorkflowPriority.MEDIUM,
    isSystemTemplate: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'High-Balance Escalation',
    description: 'Automatically escalates accounts with balances over $5,000 to a manager for immediate attention.',
    category: 'escalation',
    triggerType: WorkflowTriggerType.HIGH_BALANCE,
    defaultConditions: [
      {
        field: 'currentBalance',
        operator: WorkflowConditionOperator.GREATER_THAN,
        value: 5000
      }
    ],
    defaultActions: [
      {
        id: 'action-1',
        type: WorkflowActionType.ESCALATE_TO_MANAGER,
        order: 1,
        config: {
          reason: 'High balance account detection',
          priority: 'HIGH'
        }
      },
      {
        id: 'action-2',
        type: WorkflowActionType.UPDATE_PRIORITY,
        order: 2,
        config: {
          priority: 'HIGH'
        }
      },
      {
        id: 'action-3',
        type: WorkflowActionType.SEND_NOTIFICATION,
        order: 3,
        config: {
          message: 'High-balance account requires immediate attention'
        }
      }
    ],
    defaultPriority: WorkflowPriority.HIGH,
    isSystemTemplate: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'Payment Promise Broken',
    description: 'Triggered when a debtor breaks a payment promise. Creates an urgent follow-up task and sends a notification to the assigned collector.',
    category: 'escalation',
    triggerType: WorkflowTriggerType.PAYMENT_PROMISE_BROKEN,
    defaultConditions: [],
    defaultActions: [
      {
        id: 'action-1',
        type: WorkflowActionType.CREATE_TASK,
        order: 1,
        config: {
          taskType: 'FOLLOW_UP_CALL',
          priority: 'URGENT',
          dueDate: 'SAME_DAY'
        }
      },
      {
        id: 'action-2',
        type: WorkflowActionType.SEND_NOTIFICATION,
        order: 2,
        config: {
          message: 'Payment promise broken - immediate follow-up required'
        }
      },
      {
        id: 'action-3',
        type: WorkflowActionType.UPDATE_PRIORITY,
        order: 3,
        config: {
          priority: 'HIGH'
        }
      }
    ],
    defaultPriority: WorkflowPriority.CRITICAL,
    isSystemTemplate: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'Overdue Account Auto-Assignment',
    description: 'Automatically assigns unassigned accounts to available collectors using round-robin distribution.',
    category: 'assignment',
    triggerType: WorkflowTriggerType.TIME_BASED,
    defaultConditions: [
      {
        field: 'assignedCollectorId',
        operator: WorkflowConditionOperator.EQUALS,
        value: null
      }
    ],
    defaultActions: [
      {
        id: 'action-1',
        type: WorkflowActionType.ASSIGN_TO_COLLECTOR,
        order: 1,
        config: {
          strategy: 'ROUND_ROBIN'
        }
      }
    ],
    defaultPriority: WorkflowPriority.MEDIUM,
    isSystemTemplate: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    name: 'Compliance Alert Escalation',
    description: 'Immediately escalates any compliance violations to the compliance team and pauses all collection activities on the account.',
    category: 'compliance',
    triggerType: WorkflowTriggerType.COMPLIANCE_ALERT,
    defaultConditions: [],
    defaultActions: [
      {
        id: 'action-1',
        type: WorkflowActionType.ESCALATE_TO_MANAGER,
        order: 1,
        config: {
          escalateTo: 'COMPLIANCE_TEAM',
          reason: 'Compliance violation detected',
          priority: 'CRITICAL'
        }
      },
      {
        id: 'action-2',
        type: WorkflowActionType.SEND_NOTIFICATION,
        order: 2,
        config: {
          message: 'URGENT: Compliance violation - account paused',
          methods: ['EMAIL', 'SMS', 'IN_APP']
        }
      },
      {
        id: 'action-3',
        type: WorkflowActionType.UPDATE_PRIORITY,
        order: 3,
        config: {
          priority: 'CRITICAL'
        }
      }
    ],
    defaultPriority: WorkflowPriority.CRITICAL,
    isSystemTemplate: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    name: 'Collector Capacity Overflow',
    description: 'Automatically redistributes accounts when a collector exceeds their workload threshold to prevent burnout and maintain quality.',
    category: 'assignment',
    triggerType: WorkflowTriggerType.COLLECTOR_CAPACITY,
    defaultConditions: [
      {
        field: 'collectorWorkload',
        operator: WorkflowConditionOperator.GREATER_THAN,
        value: 100
      }
    ],
    defaultActions: [
      {
        id: 'action-1',
        type: WorkflowActionType.REASSIGN_TO_COLLECTOR,
        order: 1,
        config: {
          strategy: 'LEAST_WORKLOAD',
          reason: 'Capacity overflow'
        }
      },
      {
        id: 'action-2',
        type: WorkflowActionType.SEND_NOTIFICATION,
        order: 2,
        config: {
          message: 'Workload redistributed due to capacity threshold',
          recipientRole: 'MANAGER'
        }
      }
    ],
    defaultPriority: WorkflowPriority.HIGH,
    isSystemTemplate: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    name: 'First Contact Failure',
    description: 'Escalates accounts where initial contact attempts have failed, ensuring no account is left without proper follow-up.',
    category: 'escalation',
    triggerType: WorkflowTriggerType.CONTACT_ATTEMPT_FAILED,
    defaultConditions: [
      {
        field: 'lastContactSuccessful',
        operator: WorkflowConditionOperator.EQUALS,
        value: false
      }
    ],
    defaultActions: [
      {
        id: 'action-1',
        type: WorkflowActionType.ESCALATE_TO_MANAGER,
        order: 1,
        config: {
          reason: 'Multiple failed contact attempts',
          escalateTo: 'SENIOR_COLLECTOR'
        }
      },
      {
        id: 'action-2',
        type: WorkflowActionType.CREATE_TASK,
        order: 2,
        config: {
          taskType: 'MANUAL_REVIEW',
          priority: 'HIGH',
          note: 'Contact attempts failed - review account details'
        }
      },
      {
        id: 'action-3',
        type: WorkflowActionType.SEND_NOTIFICATION,
        order: 3,
        config: {
          message: 'Account requires manual review after failed contact attempts'
        }
      }
    ],
    defaultPriority: WorkflowPriority.HIGH,
    isSystemTemplate: true,
  }
];
