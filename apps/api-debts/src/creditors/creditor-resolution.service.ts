import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creditor } from './entities/creditor.entity';
import { GlobalCreditor } from './entities/global-creditor.entity';
import { CreditorConflict } from './entities/creditor-conflict.entity';
import { VertexAiEntityMatcherService, CreditorMatchCandidate } from './ai/vertex-ai-entity-matcher.service';
import { CreditorConflictStatus } from '@verichron/enums';

/**
 * Creditor Resolution Service (Version 2.0)
 *
 * Handles entity resolution and deduplication for creditor records using
 * Global/Local architecture with Vertex AI semantic matching.
 *
 * **Architecture:** Global/Local Schema
 * - GlobalCreditor: Platform-owned master data (Gold List + verified entries)
 * - Creditor: Organization-owned local data (tenant-isolated)
 * - CreditorConflict: Manual review queue for borderline matches
 *
 * **Resolution Strategy:**
 *
 * 1. **EIN Exact Match (100% confidence)**
 *    - Check org-owned creditors by EIN
 *    - Check global creditors by EIN
 *    - If match found, return immediately (no conflict)
 *
 * 2. **Vertex AI Semantic Match (Variable confidence)**
 *    - Query both org-owned AND global creditors
 *    - Use Gemini Flash 1.5 for semantic similarity
 *    - Fallback to Levenshtein if Vertex AI unavailable
 *
 * 3. **Four-Tier Confidence System:**
 *    - 95-100%: HIGH_CONFIDENCE → Create conflict, temp creditor
 *    - 70-94%:  MEDIUM_CONFIDENCE → Create conflict, temp creditor
 *    - 40-69%:  LOW_CONFIDENCE → Create conflict, temp creditor
 *    - <40%:    Noise Floor → Silent auto-create, no conflict
 *
 * 4. **Human-in-the-Loop Philosophy:**
 *    - AI suggests, humans decide
 *    - No auto-merge (even at 95%+ confidence)
 *    - All suggestions go through manual approval workflow
 *
 * **Temp Creditor Pattern:**
 * - Import proceeds immediately (non-blocking)
 * - Temp creditor created with hasUnresolvedConflict=true
 * - Conflict record created for admin review
 * - Admin approves merge OR confirms new via UI
 * - Debts reassigned to master after resolution
 *
 * @see APPROVED-VERTEX-AI-IMPORT-STRATEGY.md
 */
@Injectable()
export class CreditorResolutionService {
  private readonly logger = new Logger(CreditorResolutionService.name);

  // Four-tier confidence thresholds
  private readonly HIGH_CONFIDENCE_THRESHOLD = 95;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 70;
  private readonly LOW_CONFIDENCE_THRESHOLD = 40;

  constructor(
    @InjectRepository(Creditor)
    private readonly creditorRepository: Repository<Creditor>,
    @InjectRepository(GlobalCreditor)
    private readonly globalCreditorRepository: Repository<GlobalCreditor>,
    @InjectRepository(CreditorConflict)
    private readonly conflictRepository: Repository<CreditorConflict>,
    private readonly vertexAiMatcher: VertexAiEntityMatcherService,
  ) {}

  /**
   * Find or create creditor during debt import (Version 2.0)
   *
   * **New Resolution Flow:**
   * 1. Check for EIN exact match (org-owned + global)
   * 2. If no EIN match, use Vertex AI to match against all candidates
   * 3. Classify confidence tier (High/Medium/Low/Noise)
   * 4. Create temp creditor + conflict record (non-blocking)
   * 5. Return temp creditor immediately (import proceeds)
   *
   * @param organizationId - Tenant ID
   * @param legalName - Creditor name from import file
   * @param ein - Employer Identification Number (optional)
   * @param address - Creditor address data (optional)
   * @param importJobId - Import job ID for traceability (optional)
   * @returns Existing or newly created temp creditor
   */
  async findOrCreate(
    organizationId: string,
    legalName: string,
    ein?: string | null,
    address?: {
      street1?: string;
      street2?: string;
      street3?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    },
    importJobId?: string,
  ): Promise<Creditor> {
    const normalizedName = this.normalizeName(legalName);

    // STEP 1: Try EIN exact match (org-owned creditors)
    if (ein) {
      const orgEinMatch = await this.creditorRepository.findOne({
        where: {
          organizationId,
          ein: ein.toUpperCase(),
          isMasterRecord: true,
        },
      });

      if (orgEinMatch) {
        this.logger.log(
          `Resolved creditor via org EIN: ${orgEinMatch.legalName} (EIN: ${ein})`,
        );
        return orgEinMatch;
      }

      // STEP 2: Check global creditors for EIN match
      const globalEinMatch = await this.globalCreditorRepository.findOne({
        where: {
          verifiedEIN: ein.toUpperCase(),
        },
      });

      if (globalEinMatch) {
        // Check if org already has a creditor linked to this global
        const linkedCreditor = await this.creditorRepository.findOne({
          where: {
            organizationId,
            globalCreditorId: globalEinMatch.id,
            isMasterRecord: true,
          },
        });

        if (linkedCreditor) {
          this.logger.log(
            `Resolved creditor via global EIN link: ${linkedCreditor.legalName}`,
          );
          return linkedCreditor;
        }

        // No local creditor linked yet - create HIGH_CONFIDENCE conflict
        this.logger.log(
          `Platform EIN match found: ${globalEinMatch.canonicalName} - creating conflict`,
        );

        const tempCreditor = await this.createTempCreditor(
          organizationId,
          legalName,
          normalizedName,
          ein,
          address,
        );

        await this.createConflict(
          organizationId,
          legalName,
          normalizedName,
          [],
          [globalEinMatch.id],
          [100],
          'Platform EIN exact match (Gold List)',
          CreditorConflictStatus.HIGH_CONFIDENCE,
          true, // isPlatformMatch
          importJobId,
          0, // debtCount (will be updated later)
          '0', // totalPrincipal
        );

        return tempCreditor;
      }
    }

    // STEP 3: Gather all candidates (org-owned + global)
    const orgCreditors = await this.creditorRepository.find({
      where: {
        organizationId,
        isMasterRecord: true,
      },
    });

    const globalCreditors = await this.globalCreditorRepository.find({
      where: {
        isReferenceOnly: true, // Only match against Gold List for now
      },
    });

    const candidates: CreditorMatchCandidate[] = [
      ...orgCreditors.map((c) => ({
        id: c.id,
        legalName: c.legalName,
        normalizedName: c.normalizedName,
        ein: c.ein || undefined,
        street1: c.street1 || undefined,
        city: c.city || undefined,
        state: c.state || undefined,
        isGlobal: false,
      })),
      ...globalCreditors.map((g) => ({
        id: g.id,
        legalName: g.canonicalName,
        normalizedName: this.normalizeName(g.canonicalName),
        ein: g.verifiedEIN || undefined,
        street1: undefined,
        city: undefined,
        state: undefined,
        isGlobal: true,
      })),
    ];

    if (candidates.length === 0) {
      // No candidates - create new creditor without conflict
      this.logger.log(`No candidates to match - creating new creditor`);
      return this.createNewCreditor(organizationId, legalName, normalizedName, ein, address);
    }

    // STEP 4: Use Vertex AI to match
    const matches = await this.vertexAiMatcher.matchCreditor(
      legalName,
      ein || undefined,
      address,
      candidates,
    );

    if (matches.length === 0 || matches[0].confidenceScore < this.LOW_CONFIDENCE_THRESHOLD) {
      // Below noise floor - silent auto-create
      this.logger.log(
        `No confident matches (top: ${matches[0]?.confidenceScore.toFixed(1)}%) - creating new creditor`,
      );
      return this.createNewCreditor(organizationId, legalName, normalizedName, ein, address);
    }

    // STEP 5: Classify confidence tier and create conflict
    const topMatch = matches[0];
    const topMatchConfidence = topMatch.confidenceScore;

    let status: CreditorConflictStatus;
    if (topMatchConfidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      status = CreditorConflictStatus.HIGH_CONFIDENCE;
    } else if (topMatchConfidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
      status = CreditorConflictStatus.MEDIUM_CONFIDENCE;
    } else {
      status = CreditorConflictStatus.LOW_CONFIDENCE;
    }

    this.logger.log(
      `Creating ${status} conflict - Top match: ${topMatchConfidence.toFixed(1)}%`,
    );

    // STEP 6: Create temp creditor
    const tempCreditor = await this.createTempCreditor(
      organizationId,
      legalName,
      normalizedName,
      ein,
      address,
    );

    // STEP 7: Separate org and global candidate IDs
    const orgMatchIds = matches
      .filter((m) => !m.isPlatformVerified)
      .map((m) => m.candidateId);
    const globalMatchIds = matches
      .filter((m) => m.isPlatformVerified)
      .map((m) => m.candidateId);

    // STEP 8: Create conflict record
    await this.createConflict(
      organizationId,
      legalName,
      normalizedName,
      orgMatchIds,
      globalMatchIds,
      matches.map((m) => m.confidenceScore),
      topMatch.matchReason,
      status,
      topMatch.isPlatformVerified,
      importJobId,
      0, // debtCount (will be updated later when debts are created)
      '0', // totalPrincipal
    );

    return tempCreditor;
  }

  /**
   * Create a temporary creditor pending conflict resolution.
   */
  private async createTempCreditor(
    organizationId: string,
    legalName: string,
    normalizedName: string,
    ein: string | null | undefined,
    address?: any,
  ): Promise<Creditor> {
    const tempCreditor = this.creditorRepository.create({
      organizationId,
      legalName,
      normalizedName,
      ein: ein ? ein.toUpperCase() : null,
      einVerified: false,
      isMasterRecord: true, // Will be converted to duplicate if merged
      hasUnresolvedConflict: true, // Flag for UI warnings
      matchConfidenceScore: null,
      masterCreditorId: null,
      debtCount: 0,
      totalPrincipal: '0',
      hygieneScore: this.calculateHygieneScore(ein, address),
      ...address,
    });

    return (await this.creditorRepository.save(tempCreditor)) as any;
  }
  /**
   * Create a new permanent creditor (no conflict).
   */
  private async createNewCreditor(
    organizationId: string,
    legalName: string,
    normalizedName: string,
    ein: string | null | undefined,
    address?: any,
  ): Promise<Creditor> {
    const newCreditor = this.creditorRepository.create({
      organizationId,
      legalName,
      normalizedName,
      ein: ein ? ein.toUpperCase() : null,
      einVerified: false,
      isMasterRecord: true,
      hasUnresolvedConflict: false,
      matchConfidenceScore: null,
      masterCreditorId: null,
      debtCount: 0,
      totalPrincipal: '0',
      hygieneScore: this.calculateHygieneScore(ein, address),
      ...address,
    });

    return (await this.creditorRepository.save(newCreditor)) as any;
  }
  /**
   * Create a conflict record for manual review.
   */
  private async createConflict(
    organizationId: string,
    rawCreditorName: string,
    normalizedName: string,
    orgMatchIds: string[],
    globalMatchIds: string[],
    confidenceScores: number[],
    aiMatchReason: string,
    status: CreditorConflictStatus,
    isPlatformMatch: boolean,
    sourceImportId: string | undefined,
    debtCount: number,
    totalPrincipalAffected: string,
  ): Promise<CreditorConflict> {
    const conflict = this.conflictRepository.create({
      organizationId,
      rawCreditorName,
      normalizedName,
      suggestedMasterIds: [...orgMatchIds, ...globalMatchIds], // Combined list
      confidenceScores,
      aiMatchReason,
      isPlatformMatch,
      status,
      sourceImportId: sourceImportId || null,
      debtCount,
      totalPrincipalAffected,
      resolvedByUserId: null,
      resolvedAt: null,
      resolution: null,
    });

    return this.conflictRepository.save(conflict);
  }

  /**
   * Calculate hygiene score (0-100) based on data completeness.
   *
   * Scoring:
   * - EIN present: +40 points
   * - Address complete (street, city, state): +30 points
   * - No unresolved conflicts: +30 points
   */
  private calculateHygieneScore(
    ein: string | null | undefined,
    address?: { street1?: string; city?: string; state?: string },
  ): number {
    let score = 0;

    // EIN presence
    if (ein) score += 40;

    // Address completeness
    if (address?.street1 && address?.city && address?.state) {
      score += 30;
    } else if (address?.city || address?.state) {
      score += 15; // Partial address
    }

    // Note: Conflict status will be updated later (start with penalty)
    score += 0; // Will be +30 when conflict is resolved

    return score;
  }

  /**
   * Normalize creditor name for fuzzy matching.
   *
   * Removes legal entity suffixes, punctuation, and standardizes format.
   */
  normalizeName(name: string): string {
    if (!name) return '';

    let normalized = name.toUpperCase();

    // Remove common legal entity suffixes
    const suffixes = [
      'INCORPORATED',
      'INC',
      'CORPORATION',
      'CORP',
      'LIMITED',
      'LTD',
      'LLC',
      'L.L.C',
      'L.L.C.',
      'COMPANY',
      'CO',
      'N.A.',
      'NA',
      'NATIONAL ASSOCIATION',
      'LP',
      'LLP',
      'PLLC',
    ];

    // Remove suffixes (with word boundaries)
    suffixes.forEach((suffix) => {
      const regex = new RegExp(`\\b${suffix}\\b\\.?`, 'gi');
      normalized = normalized.replace(regex, '');
    });

    // Remove all punctuation
    normalized = normalized.replace(/[^\w\s]/g, '');

    // Replace multiple spaces with single space
    normalized = normalized.replace(/\s+/g, ' ');

    // Trim
    normalized = normalized.trim();

    return normalized;
  }
}
