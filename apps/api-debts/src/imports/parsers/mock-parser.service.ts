import { Injectable, Logger } from '@nestjs/common';
import { IImportParser, IPortfolioImportData, IDebtImportData } from '@verichron/contracts';

/**
 * Mock Parser Service for Local Development and Testing
 *
 * This parser simulates Document AI responses without making actual API calls.
 * Used when DOCUMENT_AI_EMULATOR=true in environment configuration.
 *
 * **Purpose:**
 * - Fast local development without GCP credentials
 * - Deterministic test data for unit/integration tests
 * - No API costs during development
 * - Simulate various parsing scenarios (success, errors, edge cases)
 *
 * **Behavior:**
 * - Returns pre-defined sample debt portfolio data
 * - Simulates processing delay (configurable)
 * - Supports multiple test fixtures for different scenarios
 * - No actual file parsing - uses fixtures based on filename patterns
 *
 * **Test Fixtures:**
 * - default: Standard portfolio with 3 debts
 * - large: Portfolio with 100+ debts (performance testing)
 * - invalid: Triggers validation errors (error handling testing)
 * - minimal: Portfolio with required fields only
 *
 * **Usage:**
 * Set DOCUMENT_AI_EMULATOR=true in .env.test, and this parser will be
 * automatically injected by ImportsModule.
 */
@Injectable()
export class MockParserService implements IImportParser {
  private readonly logger = new Logger(MockParserService.name);
  readonly name = 'mock-parser';
  readonly supportedExtensions = [
    '.csv',
    '.pdf',
    '.xlsx',
    '.jpg',
    '.png',
    '.json',
  ];

  /**
   * Parse file and return mock portfolio data.
   *
   * Selects test fixture based on filename pattern:
   * - *-large.* → Large portfolio fixture
   * - *-invalid.* → Invalid data fixture (triggers errors)
   * - *-minimal.* → Minimal required fields only
   * - default → Standard portfolio with 3 debts
   *
   * @param fileContent - File buffer (ignored in mock)
   * @param filename - Used to select test fixture
   * @returns Mock portfolio data
   */
  async parse(
    fileContent: Buffer,
    filename: string,
    options?: { columnMapping?: Record<string, string> },
  ): Promise<IPortfolioImportData> {
    this.logger.log(`[MOCK] Parsing file: ${filename} (${fileContent.length} bytes)`);

    // Simulate processing delay
    await this.simulateDelay();

    // Select fixture based on filename
    if (filename.includes('-large')) {
      return this.getLargeFixture();
    } else if (filename.includes('-invalid')) {
      return this.getInvalidFixture();
    } else if (filename.includes('-minimal')) {
      return this.getMinimalFixture();
    } else {
      return this.getDefaultFixture();
    }
  }

  /**
   * Inspect file and return mock headers and preview data.
   */
  async inspect(
    fileContent: Buffer,
    filename: string,
  ): Promise<{ headers: string[]; previewRows: any[] }> {
    this.logger.log(`[MOCK] Inspecting file: ${filename}`);
    
    const data = this.getDefaultFixture();
    const headers = [
      'Account Number',
      'Creditor Name',
      'Principal Amount',
      'Debt Date',
      'First Name',
      'Last Name',
      'Email',
      'Phone'
    ];
    
    const previewRows = data.debts.map(d => ({
      'Account Number': d.accountNumber,
      'Creditor Name': d.originalCreditorName,
      'Principal Amount': d.principalAmount.toString(),
      'Debt Date': d.originalDebtDate,
      'First Name': d.debtorFirstName,
      'Last Name': d.debtorLastName,
      'Email': d.debtorEmail,
      'Phone': d.debtorPhone
    }));

    return { headers, previewRows };
  }

  /**
   * Simulate API processing delay.
   * Configurable via DOCUMENT_AI_MOCK_DELAY_MS environment variable.
   */
  private async simulateDelay(): Promise<void> {
    const delayMs = parseInt(process.env.DOCUMENT_AI_MOCK_DELAY_MS || '500', 10);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  /**
   * Default test fixture: Standard portfolio with 3 debts.
   */
  private getDefaultFixture(): IPortfolioImportData {
    return {
      portfolioName: 'Mock Portfolio - Q1 2024 Credit Cards',
      purchaseDate: '2024-01-15',
      purchasePrice: 50000.0,
      source: 'Mock Bank - Charged-off Credit Cards',
      debts: [
        {
          accountNumber: 'MOCK-ACC-001',
          originalCreditorName: 'Mock Bank',
          principalAmount: 5000.0,
          interestAmount: 750.0,
          feesAmount: 250.0,
          originalDebtDate: '2023-01-15',
          status: 'ACTIVE',
          debtorFirstName: 'John',
          debtorLastName: 'Doe',
          debtorEmail: 'john.doe@example.com',
          debtorPhone: '555-0101',
          debtorAddressLine1: '123 Main St',
          debtorCity: 'Springfield',
          debtorState: 'IL',
          debtorZipCode: '62701',
        },
        {
          accountNumber: 'MOCK-ACC-002',
          originalCreditorName: 'Mock Bank',
          principalAmount: 3000.0,
          interestAmount: 450.0,
          feesAmount: 150.0,
          originalDebtDate: '2023-02-20',
          status: 'ACTIVE',
          debtorFirstName: 'Jane',
          debtorLastName: 'Smith',
          debtorEmail: 'jane.smith@example.com',
          debtorPhone: '555-0102',
          debtorAddressLine1: '456 Oak Ave',
          debtorCity: 'Springfield',
          debtorState: 'IL',
          debtorZipCode: '62702',
        },
        {
          accountNumber: 'MOCK-ACC-003',
          originalCreditorName: 'Mock Bank',
          principalAmount: 7500.0,
          interestAmount: 1125.0,
          feesAmount: 375.0,
          originalDebtDate: '2023-03-10',
          status: 'ACTIVE',
          debtorFirstName: 'Robert',
          debtorLastName: 'Johnson',
          debtorEmail: 'robert.johnson@example.com',
          debtorPhone: '555-0103',
          debtorAddressLine1: '789 Elm Blvd',
          debtorCity: 'Springfield',
          debtorState: 'IL',
          debtorZipCode: '62703',
        },
      ],
      metadata: {
        parseMethod: 'mock',
        parsedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Large fixture: Portfolio with 100 debts (performance testing).
   */
  private getLargeFixture(): IPortfolioImportData {
    const debts: IDebtImportData[] = [];

    for (let i = 1; i <= 100; i++) {
      debts.push({
        accountNumber: `MOCK-LARGE-${i.toString().padStart(3, '0')}`,
        originalCreditorName: 'Mock Bank',
        principalAmount: 1000.0 + i * 100,
        interestAmount: (1000.0 + i * 100) * 0.15,
        feesAmount: (1000.0 + i * 100) * 0.05,
        originalDebtDate: '2023-01-01',
        status: 'ACTIVE',
        debtorFirstName: `Debtor${i}`,
        debtorLastName: `LastName${i}`,
        debtorEmail: `debtor${i}@example.com`,
        debtorPhone: `555-${i.toString().padStart(4, '0')}`,
        debtorAddressLine1: `${i} Test St`,
        debtorCity: 'Springfield',
        debtorState: 'IL',
        debtorZipCode: '62701',
      });
    }

    return {
      portfolioName: 'Mock Large Portfolio - 100 Debts',
      purchaseDate: '2024-01-15',
      purchasePrice: 500000.0,
      source: 'Mock Bank - Large Portfolio Test',
      debts,
      metadata: {
        parseMethod: 'mock',
        parsedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Invalid fixture: Contains data that will fail validation.
   * Used for testing error handling.
   */
  private getInvalidFixture(): IPortfolioImportData {
    return {
      portfolioName: 'Mock Invalid Portfolio',
      purchaseDate: '2024-01-15',
      purchasePrice: 10000.0,
      source: 'Mock Bank - Invalid Data Test',
      debts: [
        {
          accountNumber: 'MOCK-INVALID-001',
          originalCreditorName: 'Mock Bank',
          principalAmount: -5000.0, // Invalid: negative amount
          interestAmount: 0,
          feesAmount: 0,
          originalDebtDate: '2025-12-31', // Invalid: future date
          status: 'ACTIVE',
          debtorFirstName: 'Invalid',
          debtorLastName: 'Debtor',
        },
      ],
      metadata: {
        parseMethod: 'mock',
        parsedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Minimal fixture: Only required fields populated.
   * Used for testing minimum viable import.
   */
  private getMinimalFixture(): IPortfolioImportData {
    return {
      portfolioName: 'Mock Minimal Portfolio',
      purchaseDate: '2024-01-15',
      purchasePrice: 5000.0,
      source: 'Mock Bank - Minimal Test',
      debts: [
        {
          accountNumber: 'MOCK-MIN-001',
          originalCreditorName: 'Mock Bank',
          principalAmount: 5000.0,
          originalDebtDate: '2023-01-01',
          debtorFirstName: 'John',
          debtorLastName: 'Doe',
          // Other optional fields omitted
        },
      ],
    };
  }
}
