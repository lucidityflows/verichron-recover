import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  WorkflowTriggerType,
  WorkflowConditionOperator,
  WorkflowActionType,
  WorkflowPriority,
} from '@verichron/enums';

/**
 * Migration: Seed Workflow Templates
 * 
 * This migration creates system-defined workflow templates that users can
 * copy and customize for their organization's specific needs.
 * 
 * Templates included:
 * 1. Standard Dunning Sequence - Basic collection workflow
 * 2. High-Balance Escalation - Prioritize high-value accounts
 * 3. Payment Promise Broken - React to broken payment promises
 * 4. Overdue Account Auto-Assignment - Assign old accounts automatically
 * 5. Compliance Alert Escalation - Handle compliance violations
 * 6. Collector Capacity Overflow - Redistribute overloaded collectors
 * 7. First Contact Failure - Escalate failed contact attempts
 */
export class SeedWorkflowTemplates1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Template 1: Standard Dunning Sequence
    await queryRunner.query(`
      INSERT INTO workflow_templates (
        id,
        name,
        description,
        category,
        trigger_type,
        default_conditions,
        default_actions,
        default_priority,
        is_system_template,
        created_at,
        updated_at
      ) VALUES (
        '10000000-0000-0000-0000-000000000001',
        'Standard Dunning Sequence',
        'Automated email sequence for newly created debts. Sends initial contact email, followed by reminder emails at 7 and 14 days if no payment received.',
        'compliance',
        '${WorkflowTriggerType.DEBT_CREATED}',
        '[]'::jsonb,
        '[
          {
            "id": "action-1",
            "type": "${WorkflowActionType.SEND_EMAIL}",
            "order": 1,
            "config": {
              "templateId": "initial-contact",
              "delay": 0
            }
          },
          {
            "id": "action-2",
            "type": "${WorkflowActionType.SEND_EMAIL}",
            "order": 2,
            "config": {
              "templateId": "7-day-reminder",
              "delay": 7
            }
          },
          {
            "id": "action-3",
            "type": "${WorkflowActionType.SEND_EMAIL}",
            "order": 3,
            "config": {
              "templateId": "14-day-reminder",
              "delay": 14
            }
          }
        ]'::jsonb,
        '${WorkflowPriority.MEDIUM}',
        true,
        NOW(),
        NOW()
      );
    `);

    // Template 2: High-Balance Escalation
    await queryRunner.query(`
      INSERT INTO workflow_templates (
        id,
        name,
        description,
        category,
        trigger_type,
        default_conditions,
        default_actions,
        default_priority,
        is_system_template,
        created_at,
        updated_at
      ) VALUES (
        '10000000-0000-0000-0000-000000000002',
        'High-Balance Escalation',
        'Automatically escalates accounts with balances over $5,000 that are 30+ days past due to a senior collector or manager for immediate attention.',
        'escalation',
        '${WorkflowTriggerType.HIGH_BALANCE}',
        '[
          {
            "field": "balance",
            "operator": "${WorkflowConditionOperator.GREATER_THAN}",
            "value": 5000
          },
          {
            "field": "accountAge",
            "operator": "${WorkflowConditionOperator.GREATER_THAN}",
            "value": 30
          }
        ]'::jsonb,
        '[
          {
            "id": "action-1",
            "type": "${WorkflowActionType.ESCALATE_TO_MANAGER}",
            "order": 1,
            "config": {
              "reason": "High balance account over 30 days",
              "priority": "HIGH"
            }
          },
          {
            "id": "action-2",
            "type": "${WorkflowActionType.UPDATE_PRIORITY}",
            "order": 2,
            "config": {
              "priority": "HIGH"
            }
          },
          {
            "id": "action-3",
            "type": "${WorkflowActionType.SEND_NOTIFICATION}",
            "order": 3,
            "config": {
              "message": "High-balance account requires immediate attention"
            }
          }
        ]'::jsonb,
        '${WorkflowPriority.HIGH}',
        true,
        NOW(),
        NOW()
      );
    `);

    // Template 3: Payment Promise Broken
    await queryRunner.query(`
      INSERT INTO workflow_templates (
        id,
        name,
        description,
        category,
        trigger_type,
        default_conditions,
        default_actions,
        default_priority,
        is_system_template,
        created_at,
        updated_at
      ) VALUES (
        '10000000-0000-0000-0000-000000000003',
        'Payment Promise Broken',
        'Triggered when a debtor breaks a payment promise. Creates an urgent follow-up task and sends a notification to the assigned collector.',
        'escalation',
        '${WorkflowTriggerType.PAYMENT_PROMISE_BROKEN}',
        '[]'::jsonb,
        '[
          {
            "id": "action-1",
            "type": "${WorkflowActionType.CREATE_TASK}",
            "order": 1,
            "config": {
              "taskType": "FOLLOW_UP_CALL",
              "priority": "URGENT",
              "dueDate": "SAME_DAY"
            }
          },
          {
            "id": "action-2",
            "type": "${WorkflowActionType.SEND_NOTIFICATION}",
            "order": 2,
            "config": {
              "message": "Payment promise broken - immediate follow-up required"
            }
          },
          {
            "id": "action-3",
            "type": "${WorkflowActionType.UPDATE_PRIORITY}",
            "order": 3,
            "config": {
              "priority": "HIGH"
            }
          }
        ]'::jsonb,
        '${WorkflowPriority.CRITICAL}',
        true,
        NOW(),
        NOW()
      );
    `);

    // Template 4: Overdue Account Auto-Assignment
    await queryRunner.query(`
      INSERT INTO workflow_templates (
        id,
        name,
        description,
        category,
        trigger_type,
        default_conditions,
        default_actions,
        default_priority,
        is_system_template,
        created_at,
        updated_at
      ) VALUES (
        '10000000-0000-0000-0000-000000000004',
        'Overdue Account Auto-Assignment',
        'Time-based rule that automatically assigns accounts that have been overdue for 60+ days to available collectors using round-robin distribution.',
        'assignment',
        '${WorkflowTriggerType.TIME_BASED}',
        '[
          {
            "field": "accountAge",
            "operator": "${WorkflowConditionOperator.GREATER_THAN_OR_EQUAL}",
            "value": 60
          },
          {
            "field": "assignedCollectorId",
            "operator": "${WorkflowConditionOperator.EQUALS}",
            "value": null
          }
        ]'::jsonb,
        '[
          {
            "id": "action-1",
            "type": "${WorkflowActionType.ASSIGN_TO_COLLECTOR}",
            "order": 1,
            "config": {
              "strategy": "ROUND_ROBIN"
            }
          }
        ]'::jsonb,
        '${WorkflowPriority.MEDIUM}',
        true,
        NOW(),
        NOW()
      );
    `);

    // Template 5: Compliance Alert Escalation
    await queryRunner.query(`
      INSERT INTO workflow_templates (
        id,
        name,
        description,
        category,
        trigger_type,
        default_conditions,
        default_actions,
        default_priority,
        is_system_template,
        created_at,
        updated_at
      ) VALUES (
        '10000000-0000-0000-0000-000000000005',
        'Compliance Alert Escalation',
        'Immediately escalates any compliance violations to the compliance team and pauses all collection activities on the account.',
        'compliance',
        '${WorkflowTriggerType.COMPLIANCE_ALERT}',
        '[]'::jsonb,
        '[
          {
            "id": "action-1",
            "type": "${WorkflowActionType.ESCALATE_TO_MANAGER}",
            "order": 1,
            "config": {
              "escalateTo": "COMPLIANCE_TEAM",
              "reason": "Compliance violation detected",
              "priority": "CRITICAL"
            }
          },
          {
            "id": "action-2",
            "type": "${WorkflowActionType.SEND_NOTIFICATION}",
            "order": 2,
            "config": {
              "message": "URGENT: Compliance violation - account paused",
              "methods": ["EMAIL", "SMS", "IN_APP"]
            }
          },
          {
            "id": "action-3",
            "type": "${WorkflowActionType.UPDATE_PRIORITY}",
            "order": 3,
            "config": {
              "priority": "CRITICAL"
            }
          }
        ]'::jsonb,
        '${WorkflowPriority.CRITICAL}',
        true,
        NOW(),
        NOW()
      );
    `);

    // Template 6: Collector Capacity Overflow
    await queryRunner.query(`
      INSERT INTO workflow_templates (
        id,
        name,
        description,
        category,
        trigger_type,
        default_conditions,
        default_actions,
        default_priority,
        is_system_template,
        created_at,
        updated_at
      ) VALUES (
        '10000000-0000-0000-0000-000000000006',
        'Collector Capacity Overflow',
        'Automatically redistributes accounts when a collector exceeds their workload threshold to prevent burnout and maintain quality.',
        'assignment',
        '${WorkflowTriggerType.COLLECTOR_CAPACITY}',
        '[
          {
            "field": "collectorWorkload",
            "operator": "${WorkflowConditionOperator.GREATER_THAN}",
            "value": 100
          }
        ]'::jsonb,
        '[
          {
            "id": "action-1",
            "type": "${WorkflowActionType.REASSIGN_TO_COLLECTOR}",
            "order": 1,
            "config": {
              "strategy": "LEAST_WORKLOAD",
              "reason": "Capacity overflow"
            }
          },
          {
            "id": "action-2",
            "type": "${WorkflowActionType.SEND_NOTIFICATION}",
            "order": 2,
            "config": {
              "message": "Workload redistributed due to capacity threshold",
              "recipientRole": "MANAGER"
            }
          }
        ]'::jsonb,
        '${WorkflowPriority.HIGH}',
        true,
        NOW(),
        NOW()
      );
    `);

    // Template 7: First Contact Failure
    await queryRunner.query(`
      INSERT INTO workflow_templates (
        id,
        name,
        description,
        category,
        trigger_type,
        default_conditions,
        default_actions,
        default_priority,
        is_system_template,
        created_at,
        updated_at
      ) VALUES (
        '10000000-0000-0000-0000-000000000007',
        'First Contact Failure',
        'Escalates accounts where initial contact attempts have failed after 3 tries, ensuring no account is left without proper follow-up.',
        'escalation',
        '${WorkflowTriggerType.CONTACT_ATTEMPT_FAILED}',
        '[
          {
            "field": "contactAttempts",
            "operator": "${WorkflowConditionOperator.GREATER_THAN_OR_EQUAL}",
            "value": 3
          },
          {
            "field": "lastContactSuccessful",
            "operator": "${WorkflowConditionOperator.EQUALS}",
            "value": false
          }
        ]'::jsonb,
        '[
          {
            "id": "action-1",
            "type": "${WorkflowActionType.ESCALATE_TO_MANAGER}",
            "order": 1,
            "config": {
              "reason": "Multiple failed contact attempts",
              "escalateTo": "SENIOR_COLLECTOR"
            }
          },
          {
            "id": "action-2",
            "type": "${WorkflowActionType.CREATE_TASK}",
            "order": 2,
            "config": {
              "taskType": "MANUAL_REVIEW",
              "priority": "HIGH",
              "note": "Contact attempts failed - review account details"
            }
          },
          {
            "id": "action-3",
            "type": "${WorkflowActionType.SEND_NOTIFICATION}",
            "order": 3,
            "config": {
              "message": "Account requires manual review after failed contact attempts"
            }
          }
        ]'::jsonb,
        '${WorkflowPriority.HIGH}',
        true,
        NOW(),
        NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove all seeded templates
    await queryRunner.query(`
      DELETE FROM workflow_templates
      WHERE id IN (
        '10000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000004',
        '10000000-0000-0000-0000-000000000005',
        '10000000-0000-0000-0000-000000000006',
        '10000000-0000-0000-0000-000000000007'
      );
    `);
  }
}