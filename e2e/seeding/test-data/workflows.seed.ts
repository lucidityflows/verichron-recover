/**
 * Test Data: Workflows
 *
 * Creates test workflow templates, rules, and configurations.
 */

import { DataSource } from 'typeorm';
import {
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowPriority,
  AutoAssignmentStrategy,
  EscalationEscalateTo,
  EscalationNotificationMethod,
} from '@verichron/enums';
import { log } from '../../helpers/logger';
import { TestOrganization } from './organizations.seed';

export async function seedWorkflows(
  workflowsDataSource: DataSource,
  organizations: TestOrganization[],
  users: Record<string, Array<{ id: string; email: string }>>
) {
  log('  ⚙️ Seeding workflows...', 'cyan');

  // 1. Seed Templates
  await seedWorkflowTemplates(workflowsDataSource);

  // 2. Seed Organization Rules & Configs
  for (const org of organizations) {
    const orgUsers = users[org.id] || [];
    const creator = orgUsers[0]?.id;
    const collectors = orgUsers.filter(u => u.email.includes('collector')).map(u => u.id);

    // Auto Assignment Config
    await getOrCreateAutoAssignment(workflowsDataSource, org.id, {
      name: 'Default Round-Robin Assignment',
      description: 'Standard assignment for new debts',
      strategy: AutoAssignmentStrategy.ROUND_ROBIN,
      collectorPool: collectors,
      filters: {
        balanceRange: [0, 10000],
      },
      createdBy: creator,
    });

    // Workflow Rule
    await getOrCreateWorkflowRule(workflowsDataSource, org.id, {
      name: 'Initial Contact Automation',
      description: 'Sends welcome email on debt creation',
      triggerType: WorkflowTriggerType.DEBT_CREATED,
      priority: WorkflowPriority.MEDIUM,
      conditions: [],
      actions: [
        {
          id: 'action-1',
          type: WorkflowActionType.SEND_EMAIL,
          order: 1,
          config: { templateId: 'welcome-email', delay: 0 }
        }
      ],
      createdBy: creator,
    });

    // Escalation Rule
    await getOrCreateEscalationRule(workflowsDataSource, org.id, {
      name: 'High Balance Alert',
      description: 'Escalate accounts over $5000',
      escalateTo: EscalationEscalateTo.MANAGER,
      escalationTargets: [orgUsers.find(u => u.email.includes('manager'))?.id || creator],
      notificationMethods: [EscalationNotificationMethod.IN_APP, EscalationNotificationMethod.EMAIL],
      triggerConditions: [
        {
          field: 'balance',
          operator: 'GREATER_THAN',
          value: 5000
        }
      ],
      priority: WorkflowPriority.HIGH,
      createdBy: creator,
    });
  }

  log('  ✅ Workflows seeding complete', 'green');
}

async function seedWorkflowTemplates(dataSource: DataSource) {
  const templates = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Standard Dunning Sequence',
      description: 'Automated email sequence for newly created debts.',
      category: 'compliance',
      triggerType: WorkflowTriggerType.DEBT_CREATED,
      defaultConditions: [],
      defaultActions: [
        { id: 'action-1', type: WorkflowActionType.SEND_EMAIL, order: 1, config: { templateId: 'initial-contact', delay: 0 } }
      ],
      defaultPriority: WorkflowPriority.MEDIUM,
    }
  ];

  for (const t of templates) {
    const existing = await dataSource.query(`SELECT id FROM workflow_templates WHERE id = $1`, [t.id]);
    if (!existing || existing.length === 0) {
      await dataSource.query(
        `INSERT INTO workflow_templates (
          id, name, description, category, trigger_type, default_conditions, default_actions, default_priority, is_system_template, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
        [t.id, t.name, t.description, t.category, t.triggerType, JSON.stringify(t.defaultConditions), JSON.stringify(t.defaultActions), t.defaultPriority]
      );
    }
  }
}

async function getOrCreateAutoAssignment(dataSource: DataSource, orgId: string, config: any) {
  const existing = await dataSource.query(`SELECT id FROM auto_assignment_configs WHERE organization_id = $1 AND name = $2`, [orgId, config.name]);
  if (!existing || existing.length === 0) {
    await dataSource.query(
      `INSERT INTO auto_assignment_configs (
        organization_id, name, description, strategy, collector_pool, filters, enabled, daily_assignment_counts, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, '{}', $7, NOW(), NOW())`,
      [orgId, config.name, config.description, config.strategy, JSON.stringify(config.collectorPool), JSON.stringify(config.filters), config.createdBy]
    );
  }
}

async function getOrCreateWorkflowRule(dataSource: DataSource, orgId: string, rule: any) {
  const existing = await dataSource.query(`SELECT id FROM workflow_rules WHERE organization_id = $1 AND name = $2`, [orgId, rule.name]);
  if (!existing || existing.length === 0) {
    await dataSource.query(
      `INSERT INTO workflow_rules (
        organization_id, name, description, trigger_type, conditions, actions, priority, enabled, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW())`,
      [orgId, rule.name, rule.description, rule.triggerType, JSON.stringify(rule.conditions), JSON.stringify(rule.actions), rule.priority, rule.createdBy]
    );
  }
}

async function getOrCreateEscalationRule(dataSource: DataSource, orgId: string, rule: any) {
  const existing = await dataSource.query(`SELECT id FROM escalation_rules WHERE organization_id = $1 AND name = $2`, [orgId, rule.name]);
  if (!existing || existing.length === 0) {
    await dataSource.query(
      `INSERT INTO escalation_rules (
        organization_id, name, description, escalate_to, escalation_targets, notification_methods, trigger_conditions, priority, enabled, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, NOW(), NOW())`,
      [orgId, rule.name, rule.description, rule.escalateTo, JSON.stringify(rule.escalationTargets), JSON.stringify(rule.notificationMethods), JSON.stringify(rule.triggerConditions), rule.priority, rule.createdBy]
    );
  }
}
