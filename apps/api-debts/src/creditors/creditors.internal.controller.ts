import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creditor } from './entities/creditor.entity';
import { Debt } from '../debts/entities/debt.entity'

/**
 * Internal Creditors Analytics Controller
 *
 * Provides creditor-related analytics for the event orchestrator.
 * These endpoints are internal-only and should not be exposed externally.
 *
 * Authentication: Global JwtAuthGuard automatically checks for X-Internal-API-Key header
 * and allows internal service-to-service calls without requiring JWT tokens.
 *
 * Routes: /internal/debts/creditors/analytics/*
 *
 * ROUTING PATTERN: /internal/debts/creditors/analytics
 * - Standardized with api-debts (/internal/debts/analytics)
 * - Standardized with api-communications (/internal/communications/analytics)
 * - Standardized with api-transactions (/internal/transactions/analytics)
 */
@ApiTags('Internal - Creditor Analytics')
@Controller('internal/debts/creditors/analytics')
export class InternalCreditorsController {
  constructor(
    @InjectRepository(Creditor)
    private readonly creditorRepository: Repository<Creditor>,
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
  ) {}

  @Get('geographic-flows/:organizationId')
  @ApiOperation({
    summary: 'Get actual geographic flows (creditor→debtor state pairs)',
    description: `
      Returns actual creditor→debtor state pairs with flow volumes and amounts.
      Replaces proportional estimation algorithm with real data.

      Used by: analytics-geographic-combined.orchestrator.ts

      **This is an internal endpoint** - not exposed to external users.

      REQUIRES:
      - Creditor entity populated (creditorId on debts)
      - Debtor state populated
      - Creditor state populated

      RETURNS:
      - Array of flows with creditor state, debtor state, count, and total amount
      - Only includes debts with both creditor and debtor state populated
      - Aggregated by state pair (not individual debts)
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Geographic flows retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        flows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              creditorState: {
                type: 'string',
                example: 'CA',
                description: 'Creditor state (2-letter code)',
              },
              debtorState: {
                type: 'string',
                example: 'TX',
                description: 'Debtor state (2-letter code)',
              },
              flowCount: {
                type: 'number',
                example: 150,
                description: 'Number of debts in this flow',
              },
              totalAmount: {
                type: 'number',
                example: 750000.00,
                description: 'Total principal amount of debts in this flow',
              },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            totalFlows: {
              type: 'number',
              example: 2400,
              description: 'Total number of unique creditor→debtor state pairs',
            },
            totalDebts: {
              type: 'number',
              example: 15000,
              description: 'Total number of debts included in flows',
            },
            creditorStatesCount: {
              type: 'number',
              example: 48,
              description: 'Number of unique creditor states',
            },
            debtorStatesCount: {
              type: 'number',
              example: 50,
              description: 'Number of unique debtor states',
            },
          },
        },
      },
    },
  })
  async getGeographicFlows(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    /**
     * Query actual creditor→debtor state pairs from database
     *
     * IMPORTANT: This query requires:
     * 1. Creditor entity populated with state
     * 2. Debt entity has creditorId FK populated
     * 3. DebtDebtor join has debtorId populated
     * 4. DebtorProfile has state populated
     *
     * If any of these are missing, that debt will be excluded from flows.
     */
    const flows = await this.debtRepository.query(
      `
      SELECT
        c.state AS "creditorState",
        dp.state AS "debtorState",
        COUNT(*)::integer AS "flowCount",
        SUM(d.principal_amount)::decimal AS "totalAmount"
      FROM debts d
      INNER JOIN creditors c ON d.creditor_id = c.id
      INNER JOIN debt_debtor dd ON d.id = dd.debt_id
      INNER JOIN debtor_profiles dp ON dd.debtor_profile_id = dp.id
      WHERE
        d.organization_id = $1
        AND c.state IS NOT NULL
        AND dp.state IS NOT NULL
        AND d.creditor_id IS NOT NULL
      GROUP BY c.state, dp.state
      ORDER BY "flowCount" DESC
    `,
      [organizationId],
    );

    // Calculate metadata
    const totalFlows = flows.length;
    const totalDebts = flows.reduce(
      (sum: number, flow: any) => sum + flow.flowCount,
      0,
    );
    const creditorStates = new Set(flows.map((f: any) => f.creditorState));
    const debtorStates = new Set(flows.map((f: any) => f.debtorState));

    return {
      flows,
      metadata: {
        totalFlows,
        totalDebts,
        creditorStatesCount: creditorStates.size,
        debtorStatesCount: debtorStates.size,
      },
    };
  }

  @Get('creditor-summary/:organizationId')
  @ApiOperation({
    summary: 'Get summary statistics for all creditors',
    description: `
      Returns aggregate statistics across all creditors for an organization.
      Used for manager dashboards and portfolio analysis.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Creditor summary retrieved successfully',
  })
  async getCreditorSummary(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    const summary = await this.creditorRepository.query(
      `
      SELECT
        COUNT(DISTINCT c.id)::integer AS "totalCreditors",
        COUNT(DISTINCT c.id) FILTER (WHERE c.is_master_record = true)::integer AS "masterCreditors",
        COUNT(DISTINCT c.id) FILTER (WHERE c.ein IS NOT NULL)::integer AS "creditorsWithEIN",
        COUNT(DISTINCT c.id) FILTER (WHERE c.ein_verified = true)::integer AS "verifiedCreditors",
        SUM(c.debt_count)::integer AS "totalDebts",
        SUM(c.total_principal)::decimal AS "totalPrincipal",
        COUNT(DISTINCT c.state) FILTER (WHERE c.state IS NOT NULL)::integer AS "uniqueStates"
      FROM creditors c
      WHERE c.organization_id = $1
    `,
      [organizationId],
    );

    return summary[0] || {
      totalCreditors: 0,
      masterCreditors: 0,
      creditorsWithEIN: 0,
      verifiedCreditors: 0,
      totalDebts: 0,
      totalPrincipal: '0',
      uniqueStates: 0,
    };
  }

  @Get('top-creditors/:organizationId')
  @ApiOperation({
    summary: 'Get top creditors by debt count or principal amount',
    description: `
      Returns the top creditors ranked by number of debts or total principal.
      Used for portfolio concentration analysis and creditor performance.

      **This is an internal endpoint** - not exposed to external users.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Top creditors retrieved successfully',
  })
  async getTopCreditors(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    const topCreditors = await this.creditorRepository.query(
      `
      SELECT
        c.id,
        c.legal_name AS "legalName",
        c.ein,
        c.state,
        c.debt_count AS "debtCount",
        c.total_principal AS "totalPrincipal",
        ROUND(
          (c.debt_count::decimal / NULLIF(SUM(c2.debt_count) OVER (), 0)) * 100,
          2
        )::decimal AS "debtCountPercentage",
        ROUND(
          (c.total_principal::decimal / NULLIF(SUM(c2.total_principal) OVER (), 0)) * 100,
          2
        )::decimal AS "principalPercentage"
      FROM creditors c
      CROSS JOIN creditors c2
      WHERE
        c.organization_id = $1
        AND c.is_master_record = true
        AND c2.organization_id = $1
        AND c2.is_master_record = true
      ORDER BY c.total_principal DESC
      LIMIT 20
    `,
      [organizationId],
    );

    return {
      topCreditors,
    };
  }
}
