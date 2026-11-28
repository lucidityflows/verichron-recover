/**
 * Test Data: Goals
 *
 * Creates test goals and progress for teams and collectors.
 */

import { DataSource } from 'typeorm';
import { GoalScope, GoalType, GoalPeriod, GoalUnit } from '@verichron/enums';
import { log } from '../../helpers/logger';
import { SeededTeam } from './teams.seed';

export async function seedGoals(
  collectorsDataSource: DataSource,
  teams: SeededTeam[],
  users: Record<string, Array<{ id: string; email: string }>>
) {
  log('  🎯 Seeding goals...', 'cyan');

  for (const team of teams) {
    // Team Goals
    await getOrCreateGoal(collectorsDataSource, {
      name: `Revenue Target - ${team.name}`,
      description: 'Monthly collection target for the team',
      organizationId: team.organizationId,
      teamId: team.id,
      scope: GoalScope.TEAM,
      type: GoalType.COLLECTIONS,
      period: GoalPeriod.MONTHLY,
      unit: GoalUnit.DOLLARS,
      targetValue: 50000,
      currentValue: 32500.50, // 65% progress
      createdBy: 'system-seeder',
    });

    await getOrCreateGoal(collectorsDataSource, {
      name: `Call Volume - ${team.name}`,
      description: 'Weekly outbound call target',
      organizationId: team.organizationId,
      teamId: team.id,
      scope: GoalScope.TEAM,
      type: GoalType.CONTACTS,
      period: GoalPeriod.WEEKLY,
      unit: GoalUnit.COUNT,
      targetValue: 1000,
      currentValue: 850, // 85% progress
      createdBy: 'system-seeder',
    });

    // Individual Goals for users in this team
    const teamUsers = users[team.organizationId] || [];
    for (const user of teamUsers) {
      if (user.email.includes('collector')) {
        await getOrCreateGoal(collectorsDataSource, {
          name: `Personal Revenue - ${user.email.split('@')[0]}`,
          description: 'Individual monthly revenue goal',
          organizationId: team.organizationId,
          collectorUserId: user.id,
          scope: GoalScope.INDIVIDUAL,
          type: GoalType.COLLECTIONS,
          period: GoalPeriod.MONTHLY,
          unit: GoalUnit.DOLLARS,
          targetValue: 15000,
          currentValue: 12450.75, // 83% progress
          createdBy: 'system-seeder',
        });
      }
    }
  }

  log('  ✅ Goals seeding complete', 'green');
}

interface GoalConfig {
  name: string;
  description: string;
  organizationId: string;
  teamId?: string;
  collectorUserId?: string;
  scope: GoalScope;
  type: GoalType;
  period: GoalPeriod;
  unit: GoalUnit;
  targetValue: number;
  currentValue: number;
  createdBy: string;
}

async function getOrCreateGoal(
  dataSource: DataSource,
  config: GoalConfig
) {
  let goal = await dataSource.query(
    `SELECT id FROM goals WHERE organization_id = $1 AND name = $2`,
    [config.organizationId, config.name]
  );

  let goalId: string;

  if (!goal || goal.length === 0) {
    const startDate = new Date();
    startDate.setDate(1); // Start of month
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // End of current month

    const result = await dataSource.query(
      `INSERT INTO goals (
        organization_id, name, description, team_id, collector_user_id, 
        scope, type, period, unit, target_value, is_active, is_archived, 
        created_by, start_date, end_date, created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
       RETURNING id`,
      [
        config.organizationId, config.name, config.description, config.teamId || null, 
        config.collectorUserId || null, config.scope, config.type, config.period, 
        config.unit, config.targetValue, true, false, '00000000-0000-0000-0000-000000000000', startDate, endDate
      ]
    );
    goalId = result[0].id;
    log(`    ✅ Created goal: ${config.name}`, 'reset');
  } else {
    goalId = goal[0].id;
  }

  // Set or update progress
  const existingProgress = await dataSource.query(
    `SELECT id FROM goal_progress WHERE goal_id = $1`,
    [goalId]
  );

  if (!existingProgress || existingProgress.length === 0) {
    await dataSource.query(
      `INSERT INTO goal_progress (goal_id, current_value, last_updated)
       VALUES ($1, $2, NOW())`,
      [goalId, config.currentValue]
    );
  } else {
    await dataSource.query(
      `UPDATE goal_progress SET current_value = $1, last_updated = NOW() WHERE goal_id = $2`,
      [config.currentValue, goalId]
    );
  }
}
