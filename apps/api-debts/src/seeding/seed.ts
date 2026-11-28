import 'reflect-metadata';
import dataSource from '../../datasource';
import { GlobalCreditor } from '../creditors/entities/global-creditor.entity';
import * as crypto from 'crypto';

/**
 * Seed Global Creditors (Gold List v0.1)
 *
 * Platform-owned master creditor registry for cross-tenant entity resolution.
 * This is idempotent - safe to run multiple times.
 */
async function seedGlobalCreditors() {
  const globalCreditorRepository = dataSource.getRepository(GlobalCreditor);

  console.log('\n🌐 Seeding Global Creditors (Gold List v0.1)...\n');

  const globalCreditors = [
    // TIER 1: Major National Banks
    {
      canonicalName: 'JPMorgan Chase Bank, N.A.',
      verifiedEIN: '13-4994650',
      knownAliases: ['Chase Bank', 'Chase', 'JPMorgan Chase', 'Chase Bank N.A.', 'JPMORGAN CHASE BANK'],
      isReferenceOnly: true,
      industryCategory: 'Banking',
      notes: 'Largest US bank by assets',
    },
    {
      canonicalName: 'Bank of America, N.A.',
      verifiedEIN: '94-1223226',
      knownAliases: ['Bank of America', 'BofA', 'BOA', 'Bank of America NA', 'BANK OF AMERICA'],
      isReferenceOnly: true,
      industryCategory: 'Banking',
      notes: '2nd largest US bank',
    },
    {
      canonicalName: 'Wells Fargo Bank, National Association',
      verifiedEIN: '68-0316533',
      knownAliases: ['Wells Fargo', 'Wells Fargo Bank', 'Wells Fargo Bank NA', 'WELLS FARGO', 'WF Bank'],
      isReferenceOnly: true,
      industryCategory: 'Banking',
      notes: '3rd largest US bank',
    },
    {
      canonicalName: 'Citibank, N.A.',
      verifiedEIN: '13-5266470',
      knownAliases: ['Citibank', 'Citi', 'Citibank NA', 'CITIBANK', 'Citicorp'],
      isReferenceOnly: true,
      industryCategory: 'Banking',
      notes: '4th largest US bank',
    },
    {
      canonicalName: 'U.S. Bank National Association',
      verifiedEIN: '41-0255900',
      knownAliases: ['US Bank', 'U.S. Bank', 'USB', 'US Bank NA', 'USBANK'],
      isReferenceOnly: true,
      industryCategory: 'Banking',
      notes: '5th largest US bank',
    },

    // TIER 2: Major Credit Card Issuers
    {
      canonicalName: 'Capital One Financial Corporation',
      verifiedEIN: '54-1719854',
      knownAliases: ['Capital One', 'CapitalOne', 'Capital One Bank', 'CAPITAL ONE', 'Cap1'],
      isReferenceOnly: true,
      industryCategory: 'Credit Cards',
      notes: 'Top 10 US bank, major credit card issuer',
    },
    {
      canonicalName: 'Discover Bank',
      verifiedEIN: '36-2517428',
      knownAliases: ['Discover', 'Discover Financial', 'Discover Card', 'DISCOVER BANK'],
      isReferenceOnly: true,
      industryCategory: 'Credit Cards',
      notes: 'Major credit card and consumer lending',
    },
    {
      canonicalName: 'American Express Company',
      verifiedEIN: '13-4922250',
      knownAliases: ['American Express', 'Amex', 'AmEx', 'AMERICAN EXPRESS', 'Amer Express'],
      isReferenceOnly: true,
      industryCategory: 'Credit Cards',
      notes: 'Major charge/credit card issuer',
    },
    {
      canonicalName: 'Synchrony Bank',
      verifiedEIN: '51-0483352',
      knownAliases: ['Synchrony', 'Synchrony Financial', 'SYNCHRONY BANK', 'GE Capital Retail Bank'],
      isReferenceOnly: true,
      industryCategory: 'Consumer Finance',
      notes: 'Store credit cards (Amazon, Lowes, etc.)',
    },

    // TIER 3: Auto Finance
    {
      canonicalName: 'Ally Financial Inc.',
      verifiedEIN: '38-3815200',
      knownAliases: ['Ally', 'Ally Bank', 'Ally Auto', 'ALLY FINANCIAL', 'GMAC'],
      isReferenceOnly: true,
      industryCategory: 'Auto Finance',
      notes: 'Major auto lender',
    },
    {
      canonicalName: 'Toyota Motor Credit Corporation',
      verifiedEIN: '95-3500202',
      knownAliases: ['Toyota Credit', 'Toyota Financial', 'TMCC', 'TOYOTA MOTOR CREDIT'],
      isReferenceOnly: true,
      industryCategory: 'Auto Finance',
      notes: 'Toyota/Lexus financing',
    },
    {
      canonicalName: 'Ford Motor Credit Company LLC',
      verifiedEIN: '38-0814705',
      knownAliases: ['Ford Credit', 'Ford Motor Credit', 'FMCC', 'FORD CREDIT'],
      isReferenceOnly: true,
      industryCategory: 'Auto Finance',
      notes: 'Ford/Lincoln financing',
    },

    // TIER 4: Major Telecommunications
    {
      canonicalName: 'Verizon Wireless Services LLC',
      verifiedEIN: '20-0442121',
      knownAliases: ['Verizon', 'Verizon Wireless', 'VZW', 'VERIZON WIRELESS', 'Verizon Communications'],
      isReferenceOnly: true,
      industryCategory: 'Telecommunications',
      notes: 'Largest US wireless carrier',
    },
    {
      canonicalName: 'AT&T Services, Inc.',
      verifiedEIN: '43-1301883',
      knownAliases: ['AT&T', 'ATT', 'AT&T Wireless', 'AT&T Mobility', 'AMERICAN TELEPHONE AND TELEGRAPH'],
      isReferenceOnly: true,
      industryCategory: 'Telecommunications',
      notes: '2nd largest US wireless carrier',
    },
    {
      canonicalName: 'T-Mobile USA, Inc.',
      verifiedEIN: '20-0836269',
      knownAliases: ['T-Mobile', 'TMobile', 'T Mobile', 'Sprint', 'T-MOBILE USA'],
      isReferenceOnly: true,
      industryCategory: 'Telecommunications',
      notes: '3rd largest US wireless (merged with Sprint)',
    },
    {
      canonicalName: 'Comcast Cable Communications, LLC',
      verifiedEIN: '27-0000798',
      knownAliases: ['Comcast', 'Xfinity', 'Comcast Cable', 'COMCAST', 'Comcast Corporation'],
      isReferenceOnly: true,
      industryCategory: 'Telecommunications',
      notes: 'Largest US cable/internet provider',
    },
    {
      canonicalName: 'Charter Communications, Inc.',
      verifiedEIN: '43-1857213',
      knownAliases: ['Charter', 'Spectrum', 'Charter Spectrum', 'CHARTER COMMUNICATIONS', 'Time Warner Cable'],
      isReferenceOnly: true,
      industryCategory: 'Telecommunications',
      notes: '2nd largest US cable provider',
    },

    // TIER 5: Major Utilities
    {
      canonicalName: 'Commonwealth Edison Company',
      verifiedEIN: '36-0938600',
      knownAliases: ['ComEd', 'Commonwealth Edison', 'COM ED', 'COMED'],
      isReferenceOnly: true,
      industryCategory: 'Utilities',
      notes: 'Illinois electric utility (Exelon)',
    },
    {
      canonicalName: 'Pacific Gas and Electric Company',
      verifiedEIN: '94-0742640',
      knownAliases: ['PG&E', 'PGE', 'Pacific Gas Electric', 'PACIFIC GAS AND ELECTRIC'],
      isReferenceOnly: true,
      industryCategory: 'Utilities',
      notes: 'California gas/electric utility',
    },
    {
      canonicalName: 'Florida Power & Light Company',
      verifiedEIN: '59-0247775',
      knownAliases: ['FPL', 'Florida Power Light', 'Florida Power and Light', 'FLORIDA POWER & LIGHT'],
      isReferenceOnly: true,
      industryCategory: 'Utilities',
      notes: 'Florida electric utility (NextEra)',
    },
    {
      canonicalName: 'Consolidated Edison Company of New York, Inc.',
      verifiedEIN: '13-5009340',
      knownAliases: ['Con Edison', 'ConEd', 'Con Ed', 'CONSOLIDATED EDISON', 'ConEdison'],
      isReferenceOnly: true,
      industryCategory: 'Utilities',
      notes: 'New York City electric/gas utility',
    },
    {
      canonicalName: 'Duke Energy Corporation',
      verifiedEIN: '56-2015000',
      knownAliases: ['Duke Energy', 'Duke Power', 'DUKE ENERGY', 'Duke Energy Progress'],
      isReferenceOnly: true,
      industryCategory: 'Utilities',
      notes: 'Southeast US electric utility',
    },

    // TIER 6: Healthcare
    {
      canonicalName: 'HCA Healthcare, Inc.',
      verifiedEIN: '75-2497104',
      knownAliases: ['HCA', 'HCA Healthcare', 'Hospital Corporation of America', 'HCA HOLDINGS'],
      isReferenceOnly: true,
      industryCategory: 'Healthcare',
      notes: 'Largest US hospital chain',
    },
    {
      canonicalName: 'Community Health Systems, Inc.',
      verifiedEIN: '13-3893191',
      knownAliases: ['CHS', 'Community Health', 'COMMUNITY HEALTH SYSTEMS'],
      isReferenceOnly: true,
      industryCategory: 'Healthcare',
      notes: 'Major US hospital operator',
    },

    // TIER 7: Student Loans
    {
      canonicalName: 'Navient Solutions, LLC',
      verifiedEIN: '46-4054283',
      knownAliases: ['Navient', 'Navient Corporation', 'NAVIENT SOLUTIONS', 'Sallie Mae'],
      isReferenceOnly: true,
      industryCategory: 'Student Loans',
      notes: 'Major student loan servicer',
    },
    {
      canonicalName: 'SLM Corporation',
      verifiedEIN: '52-2013874',
      knownAliases: ['Sallie Mae', 'SLM Corp', 'SLM CORPORATION', 'Student Loan Marketing Association'],
      isReferenceOnly: true,
      industryCategory: 'Student Loans',
      notes: 'Student loan provider (legacy Sallie Mae)',
    },

    // TIER 8: Major Retailers
    {
      canonicalName: 'Target Corporation',
      verifiedEIN: '41-0215170',
      knownAliases: ['Target', 'Target Stores', 'TARGET CORP', 'Target RedCard'],
      isReferenceOnly: true,
      industryCategory: 'Retail',
      notes: 'Major retailer with store credit card',
    },
    {
      canonicalName: "Macy's, Inc.",
      verifiedEIN: '13-3324058',
      knownAliases: ['Macys', "Macy's", 'MACYS INC', "Macy's Credit"],
      isReferenceOnly: true,
      industryCategory: 'Retail',
      notes: 'Department store with private label credit',
    },

    // TIER 9: Debt Buyers
    {
      canonicalName: 'Portfolio Recovery Associates, LLC',
      verifiedEIN: '54-1885657',
      knownAliases: ['PRA', 'Portfolio Recovery', 'PORTFOLIO RECOVERY ASSOCIATES', 'PRA Group'],
      isReferenceOnly: true,
      industryCategory: 'Debt Buyer',
      notes: 'Major debt buyer/collector',
    },
  ];

  let createdCount = 0;
  let existingCount = 0;

  for (const creditor of globalCreditors) {
    const existing = await globalCreditorRepository.findOne({
      where: { verifiedEIN: creditor.verifiedEIN },
    });

    if (!existing) {
      await globalCreditorRepository.save({
        id: crypto.randomUUID(),
        ...creditor,
      });
      console.log(`  ✅ Created: ${creditor.canonicalName}`);
      createdCount++;
    } else {
      console.log(`  ⏭️  Already exists: ${creditor.canonicalName}`);
      existingCount++;
    }
  }

  console.log(
    `\n✅ Global Creditors seeding complete (${createdCount} created, ${existingCount} existing)\n`,
  );
}

async function main() {
  try {
    console.log('🚀 Starting api-debts system configuration seeding...\n');
    console.log('   This seeds ONLY platform-level configuration:\n');
    console.log('   - Global Creditors (Gold List v0.1)\n');
    console.log('   For test data (debts, debtors), use e2e seeding scripts.\n');

    await dataSource.initialize();
    console.log('📦 Database connection established\n');

    await seedGlobalCreditors();

    console.log('🎉 System configuration seeding complete!\n');
    console.log('ℹ️  No organization-specific data created.');
    console.log('   For testing, run: pnpm e2e setup && pnpm e2e ui-setup\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:\n', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

main();
