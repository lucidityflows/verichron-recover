import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

/**
 * VertexAI Entity Matcher Service
 *
 * Uses Google Cloud Vertex AI Gemini Flash 1.5 for semantic entity resolution
 * of creditor names during debt import.
 */

export interface CreditorMatchCandidate {
  id: string;
  legalName: string;
  normalizedName: string;
  ein?: string;
  street1?: string;
  city?: string;
  state?: string;
  isGlobal?: boolean; // TRUE if from global_creditors table
}

export interface CreditorMatchResult {
  candidateId: string;
  confidenceScore: number; // 0-100
  matchReason: string;
  isEinMatch: boolean;
  isPlatformVerified: boolean;
}

@Injectable()
export class VertexAiEntityMatcherService {
  private readonly logger = new Logger(VertexAiEntityMatcherService.name);

  private projectId: string;
  private location: string;
  private modelName: string;
  private timeout: number;
  private enabled: boolean;

  private vertexAi: VertexAI;
  private generativeModel: GenerativeModel;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<string>('VERTEX_AI_ENABLED', 'false') === 'true';

    if (!this.enabled) {
      this.logger.log('Vertex AI Entity Matcher disabled (will use Levenshtein fallback)');
      return;
    }

    this.projectId = this.config.get<string>('GCP_PROJECT_ID')!;
    this.location = this.config.get<string>('VERTEX_AI_LOCATION', 'us-central1');
    this.modelName = this.config.get<string>('VERTEX_AI_MODEL', 'gemini-1.5-flash');
    this.timeout = this.config.get<number>('VERTEX_AI_TIMEOUT_MS', 5000);

    if (!this.projectId) {
      this.logger.warn('GCP_PROJECT_ID not configured. Vertex AI Entity Matcher will be disabled.');
      this.enabled = false;
      return;
    }

    // Initialize Vertex AI client
    try {
      this.vertexAi = new VertexAI({
        project: this.projectId,
        location: this.location,
      });

      this.generativeModel = this.vertexAi.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
        }
      });

      this.logger.log('Vertex AI Entity Matcher initialized', {
        projectId: this.projectId,
        location: this.location,
        model: this.modelName,
      });
    } catch (error) {
      this.logger.error('Failed to initialize Vertex AI client', error);
      this.enabled = false;
    }
  }

  /**
   * Match a creditor name against a list of candidate master creditors.
   *
   * Process:
   * 1. Check for EIN exact match (100% confidence)
   * 2. If no EIN match, use Vertex AI Gemini for semantic matching
   * 3. Fallback to Levenshtein if Vertex AI unavailable
   * 4. Return sorted matches by confidence (highest first)
   *
   * @param inputName - Raw creditor name from import file
   * @param inputEin - Optional EIN for exact matching
   * @param inputAddress - Optional address for verification
   * @param candidates - List of master creditors to match against
   * @returns Array of matches sorted by confidence (descending)
   */
  async matchCreditor(
    inputName: string,
    inputEin: string | undefined,
    inputAddress: { street1?: string; city?: string; state?: string } | undefined,
    candidates: CreditorMatchCandidate[],
  ): Promise<CreditorMatchResult[]> {
    const startTime = Date.now();

    // Step 1: EIN exact match (highest priority)
    if (inputEin) {
      const einMatch = candidates.find((c) => c.ein === inputEin);
      if (einMatch) {
        this.logger.log('EIN exact match found', {
          inputEin,
          matchedCreditorId: einMatch.id,
        });

        return [
          {
            candidateId: einMatch.id,
            confidenceScore: 100,
            matchReason: 'EIN exact match',
            isEinMatch: true,
            isPlatformVerified: einMatch.isGlobal || false,
          },
        ];
      }
    }

    // Step 2: Vertex AI semantic matching
    let matches: CreditorMatchResult[] = [];

    if (this.enabled && this.generativeModel) {
      try {
        matches = await this.matchWithVertexAi(inputName, inputAddress, candidates);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn('Vertex AI matching failed, falling back to Levenshtein', {
          error: errorMessage,
        });
        matches = this.matchWithLevenshtein(inputName, candidates);
      }
    } else {
      // Step 3: Levenshtein fallback
      matches = this.matchWithLevenshtein(inputName, candidates);
    }

    const elapsed = Date.now() - startTime;
    this.logger.log('Creditor matching completed', {
      inputName,
      candidatesCount: candidates.length,
      matchesCount: matches.length,
      topConfidence: matches[0]?.confidenceScore || 0,
      elapsedMs: elapsed,
    });

    return matches;
  }

  /**
   * Use Vertex AI Gemini Flash to calculate semantic similarity.
   */
  private async matchWithVertexAi(
    inputName: string,
    inputAddress: { street1?: string; city?: string; state?: string } | undefined,
    candidates: CreditorMatchCandidate[],
  ): Promise<CreditorMatchResult[]> {
    const prompt = this.buildPrompt(inputName, inputAddress, candidates);
    
    const result = await this.generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Vertex AI');
    }

    try {
      const results = JSON.parse(text);
      
      if (!Array.isArray(results)) {
        throw new Error('Invalid JSON response format (expected array)');
      }

      return results.map((r) => ({
        candidateId: r.candidateId,
        confidenceScore: (r.score || 0) * 100,
        matchReason: r.reason || 'Semantic match identified by AI',
        isEinMatch: false,
        isPlatformVerified: candidates.find(c => c.id === r.candidateId)?.isGlobal || false,
      }));
    } catch (parseError) {
      this.logger.error('Failed to parse Vertex AI response JSON', { text });
      throw parseError;
    }
  }

  /**
   * Build prompt for Vertex AI Gemini.
   */
  private buildPrompt(
    inputName: string,
    inputAddress: { street1?: string; city?: string; state?: string } | undefined,
    candidates: CreditorMatchCandidate[],
  ): string {
    const addressStr = inputAddress
      ? `Address: ${inputAddress.street1 || ''}, ${inputAddress.city || ''}, ${inputAddress.state || ''}`
      : 'Address: Not provided';

    const candidatesStr = candidates
      .map(
        (c, i) =>
          `${i + 1}. ID: ${c.id}, Name: "${c.legalName}", EIN: ${c.ein || 'N/A'}, Address: ${c.street1 || 'N/A'}, ${c.city || ''}, ${c.state || ''}`,
      )
      .join('\n');

    return `You are an expert in entity resolution for debt collection creditors.

**Task:** Compare the input creditor against the known master creditors below. Return similarity scores (0.0 to 1.0) for each candidate.

**Input Creditor:**
Name: "${inputName}"
${addressStr}

**Known Master Creditors:**
${candidatesStr}

**Instructions:**
1. Consider legal entity variations (Inc/LLC/Corp/Ltd/N.A.)
2. Handle abbreviations (JPM = JPMorgan, Chase = Chase Bank)
3. Account for typos and misspellings
4. Consider address proximity if addresses provided
5. Return top 3 matches only (or fewer if confidence < 0.40)

**Output Format (JSON only, no explanation):**
[
  {
    "candidateId": "uuid-here",
    "score": 0.98,
    "reason": "Legal entity variation (Inc vs N.A.) + same address"
  },
  ...
]

Return an empty array [] if no matches have confidence >= 0.40.`;
  }

  /**
   * Fallback to Levenshtein distance matching.
   *
   * Algorithm:
   * 1. Normalize names (uppercase, remove Inc/LLC/Corp)
   * 2. Calculate Levenshtein distance
   * 3. Convert to similarity percentage
   * 4. Return matches above 40% threshold
   */
  private matchWithLevenshtein(
    inputName: string,
    candidates: CreditorMatchCandidate[],
  ): CreditorMatchResult[] {
    const normalizedInput = this.normalizeName(inputName);

    const results = candidates
      .map((candidate) => {
        const similarity = this.calculateSimilarity(normalizedInput, candidate.normalizedName);

        return {
          candidateId: candidate.id,
          confidenceScore: similarity,
          matchReason: `Levenshtein similarity: ${similarity.toFixed(1)}%`,
          isEinMatch: false,
          isPlatformVerified: candidate.isGlobal || false,
        };
      })
      .filter((r) => r.confidenceScore >= 40) // Noise floor threshold
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 5); // Return top 5 matches

    return results;
  }

  /**
   * Normalize creditor name for matching.
   * - Convert to uppercase
   * - Remove common suffixes (Inc, LLC, Corp, Ltd, N.A.)
   * - Remove punctuation
   */
  private normalizeName(name: string): string {
    return name
      .toUpperCase()
      .replace(/\s+(INC|LLC|CORP|LTD|L\.L\.C\.|N\.A\.|INCORPORATED|CORPORATION|LIMITED)\.?$/i, '')
      .replace(/[^A-Z0-9\s]/g, '')
      .trim();
  }

  /**
   * Calculate Levenshtein similarity as percentage (0-100).
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) return 100;

    const similarity = ((maxLength - distance) / maxLength) * 100;
    return Math.max(0, Math.min(100, similarity));
  }

  /**
   * Calculate Levenshtein distance between two strings.
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
