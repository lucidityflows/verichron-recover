/**
 * Test Data: Teams
 *
 * Creates test teams and memberships for UI development.
 */

import { DataSource } from 'typeorm';
import { TeamMemberRole, DebtCategory } from '@verichron/enums';
import { log } from '../../helpers/logger';
import { TestOrganization } from './organizations.seed';

export interface SeededTeam {
  id: string;
  name: string;
  organizationId: string;
}

export async function seedTeams(
  orgsDataSource: DataSource,
  debtsDataSource: DataSource,
  organizations: TestOrganization[],
  users: Record<string, Array<{ id: string; email: string }>>
): Promise<SeededTeam[]> {
  log('  👥 Seeding teams...', 'cyan');

  const seededTeams: SeededTeam[] = [];

  for (const org of organizations) {
    const orgUsers = users[org.id] || [];
    const managers = orgUsers.filter(u => u.email.includes('hogan') || u.email.includes('fury') || u.email.includes('lucius.fox'));
    const teamLeads = orgUsers.filter(u => u.email.includes('steve.rogers') || u.email.includes('carol.danvers') || u.email.includes('barbara.gordon'));
    const collectors = orgUsers.filter(u =>
      u.email.includes('romanoff') ||
      u.email.includes('barton') ||
      u.email.includes('wilson') ||
      u.email.includes('maximoff') ||
      u.email.includes('scott.lang') ||
      u.email.includes('grayson') ||
      u.email.includes('drake') ||
      u.email.includes('jason.todd')
    );

    // Fetch portfolios for this organization
    const portfolios = await debtsDataSource.query(
      `SELECT id, name, primary_debt_category FROM portfolios WHERE organization_id = $1`,
      [org.id]
    );

    // Create Team Alpha with manager
    const teamAlpha = await getOrCreateTeam(
      orgsDataSource,
      org.id,
      'Team Alpha',
      'The primary collection team',
      managers[0]?.id
    );
    seededTeams.push(teamAlpha);

    // Create Team Beta with manager
    const teamBeta = await getOrCreateTeam(
      orgsDataSource,
      org.id,
      'Team Beta',
      'Specialized high-balance accounts',
      managers[1]?.id || managers[0]?.id
    );
    seededTeams.push(teamBeta);

    // Assign Team Alpha members
    // Team Lead
    if (teamLeads[0]) {
      await assignTeamMember(orgsDataSource, teamAlpha.id, teamLeads[0].id, TeamMemberRole.LEAD, true);
    }
    // Collectors
    for (let i = 0; i < Math.min(collectors.length, 3); i++) {
      await assignTeamMember(orgsDataSource, teamAlpha.id, collectors[i].id, TeamMemberRole.MEMBER, false);
    }

    // Assign Team Beta members
    // Team Lead
    if (teamLeads[1]) {
      await assignTeamMember(orgsDataSource, teamBeta.id, teamLeads[1].id, TeamMemberRole.LEAD, true);
    }
    // Collectors
    for (let i = 3; i < Math.min(collectors.length, 5); i++) {
      await assignTeamMember(orgsDataSource, teamBeta.id, collectors[i].id, TeamMemberRole.MEMBER, false);
    }

    // ========================================================================
    // Portfolio Assignments
    // ========================================================================
    
    // Assign Team Alpha to ALL portfolios
    for (const portfolio of portfolios) {
      await assignTeamToPortfolio(orgsDataSource, org.id, portfolio.id, teamAlpha.id);
    }

    // Assign Team Beta to SPECIALIZED portfolios (Auto & Credit Card)
    const specializedPortfolios = portfolios.filter((p: any) => 
      p.primary_debt_category === DebtCategory.AUTO_LOAN || 
      p.primary_debt_category === DebtCategory.CREDIT_CARD
    );
    
    for (const portfolio of specializedPortfolios) {
      await assignTeamToPortfolio(orgsDataSource, org.id, portfolio.id, teamBeta.id);
    }
  }

  log('  ✅ Teams seeding complete', 'green');
  return seededTeams;
}

async function getOrCreateTeam(
  dataSource: DataSource,
  orgId: string,
  name: string,
  description: string,
  managerId?: string
): Promise<SeededTeam> {
  let team = await dataSource.query(
    `SELECT id, name, organization_id FROM teams WHERE organization_id = $1 AND name = $2`,
    [orgId, name]
  );

  if (!team || team.length === 0) {
    const result = await dataSource.query(
      `INSERT INTO teams (organization_id, name, description, manager_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, organization_id`,
      [orgId, name, description, managerId || null]
    );
    team = result[0];
    log(`    ✅ Created team: ${name} in org ${orgId}`, 'reset');
  } else {
    team = team[0];
  }

  return {
    id: team.id,
    name: team.name,
    organizationId: team.organization_id,
  };
}

async function assignTeamMember(
  dataSource: DataSource,
  teamId: string,
  userId: string,
  role: TeamMemberRole,
  isPrimary: boolean
) {
  const existing = await dataSource.query(
    `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2`,
    [teamId, userId]
  );

  if (!existing || existing.length === 0) {
    await dataSource.query(
      `INSERT INTO team_members (team_id, user_id, role_on_team, is_primary, joined_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [teamId, userId, role, isPrimary]
    );
    log(`    → Assigned user ${userId} to team ${teamId} as ${role}`, 'reset');
  }
}

async function assignTeamToPortfolio(
  dataSource: DataSource,
  orgId: string,
  portfolioId: string,
  teamId: string
) {
  const existing = await dataSource.query(
    `SELECT 1 FROM portfolio_team_assignments WHERE portfolio_id = $1 AND team_id = $2`,
    [portfolioId, teamId]
  );

  if (!existing || existing.length === 0) {
    await dataSource.query(
      `INSERT INTO portfolio_team_assignments (organization_id, portfolio_id, team_id, assigned_at)
       VALUES ($1, $2, $3, NOW())`,
      [orgId, portfolioId, teamId]
    );
    // log(`    🔗 Linked Team ${teamId} to Portfolio ${portfolioId}`, 'reset');
  }
}