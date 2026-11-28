import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { log } from '../../helpers/logger';

/**
 * Seed Test Creditors
 *
 * Creates realistic creditor entities for testing geographic flows,
 * entity resolution, and creditor analytics.
 *
 * Creditors represent original creditors (banks, credit unions, utilities, etc.)
 * before debts were placed with collection agencies.
 */

interface CreditorData {
  id: string;
  organizationId: string;
  legalName: string;
  ein: string;
  normalizedName: string;
  street1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  industry?: string;
  isMasterRecord: boolean;
}

export async function seedCreditors(
  debtsDataSource: DataSource,
  organizations: Array<{ id: string; name: string }>,
): Promise<Map<string, CreditorData[]>> {
  const creditorsByOrg = new Map<string, CreditorData[]>();

  for (const org of organizations) {
    log(`  -> Seeding creditors for ${org.name}...`, 'cyan');

    // Create 8-10 diverse creditors per organization
    const creditors: CreditorData[] = [
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'First National Bank of California, Inc.',
        ein: '94-1234567',
        normalizedName: 'FIRST NATIONAL BANK OF CALIFORNIA',
        street1: '123 Market Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'US',
        latitude: 37.7749,
        longitude: -122.4194,
        industry: 'Banking',
        isMasterRecord: true,
      },
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'Chase Bank N.A.',
        ein: '13-4994650',
        normalizedName: 'CHASE BANK',
        street1: '270 Park Avenue',
        city: 'New York',
        state: 'NY',
        postalCode: '10017',
        country: 'US',
        latitude: 40.7549,
        longitude: -73.9840,
        industry: 'Banking',
        isMasterRecord: true,
      },
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'Capital One Financial Corporation',
        ein: '54-1719854',
        normalizedName: 'CAPITAL ONE',
        street1: '1680 Capital One Drive',
        city: 'McLean',
        state: 'VA',
        postalCode: '22102',
        country: 'US',
        latitude: 38.9315,
        longitude: -77.2272,
        industry: 'Credit Cards',
        isMasterRecord: true,
      },
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'Texas Community Credit Union',
        ein: '74-2345678',
        normalizedName: 'TEXAS COMMUNITY CREDIT UNION',
        street1: '456 Main Street',
        city: 'Dallas',
        state: 'TX',
        postalCode: '75201',
        country: 'US',
        latitude: 32.7767,
        longitude: -96.7970,
        industry: 'Credit Union',
        isMasterRecord: true,
      },
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'Verizon Wireless Services LLC',
        ein: '20-0442121',
        normalizedName: 'VERIZON WIRELESS',
        street1: '1 Verizon Way',
        city: 'Basking Ridge',
        state: 'NJ',
        postalCode: '07920',
        country: 'US',
        latitude: 40.6979,
        longitude: -74.5522,
        industry: 'Telecommunications',
        isMasterRecord: true,
      },
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'ComEd - Commonwealth Edison Company',
        ein: '36-0938600',
        normalizedName: 'COMMONWEALTH EDISON',
        street1: '440 S LaSalle Street',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60605',
        country: 'US',
        latitude: 41.8781,
        longitude: -87.6298,
        industry: 'Utilities',
        isMasterRecord: true,
      },
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'Ally Financial Inc.',
        ein: '38-3815200',
        normalizedName: 'ALLY FINANCIAL',
        street1: '500 Woodward Avenue',
        city: 'Detroit',
        state: 'MI',
        postalCode: '48226',
        country: 'US',
        latitude: 42.3314,
        longitude: -83.0458,
        industry: 'Auto Finance',
        isMasterRecord: true,
      },
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'Synchrony Bank',
        ein: '51-0483352',
        normalizedName: 'SYNCHRONY BANK',
        street1: '170 Election Road',
        city: 'Draper',
        state: 'UT',
        postalCode: '84020',
        country: 'US',
        latitude: 40.5246,
        longitude: -111.8638,
        industry: 'Consumer Finance',
        isMasterRecord: true,
      },
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'Florida Power & Light Company',
        ein: '59-0247775',
        normalizedName: 'FLORIDA POWER LIGHT',
        street1: '700 Universe Boulevard',
        city: 'Juno Beach',
        state: 'FL',
        postalCode: '33408',
        country: 'US',
        latitude: 26.8810,
        longitude: -80.0526,
        industry: 'Utilities',
        isMasterRecord: true,
      },
      {
        id: crypto.randomUUID(),
        organizationId: org.id,
        legalName: 'Wells Fargo Bank, National Association',
        ein: '68-0316533',
        normalizedName: 'WELLS FARGO BANK',
        street1: '420 Montgomery Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94104',
        country: 'US',
        latitude: 37.7933,
        longitude: -122.4020,
        industry: 'Banking',
        isMasterRecord: true,
      },
    ];

    // Insert creditors
    for (const creditor of creditors) {
      await debtsDataSource.query(
        `
        INSERT INTO creditors (
          id,
          organization_id,
          legal_name,
          ein,
          normalized_name,
          street1,
          city,
          state,
          postal_code,
          country,
          latitude,
          longitude,
          industry,
          is_master_record
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          creditor.id,
          creditor.organizationId,
          creditor.legalName,
          creditor.ein,
          creditor.normalizedName,
          creditor.street1,
          creditor.city,
          creditor.state,
          creditor.postalCode,
          creditor.country,
          creditor.latitude,
          creditor.longitude,
          creditor.industry,
          creditor.isMasterRecord,
        ],
      );
    }

    creditorsByOrg.set(org.id, creditors);
    log(`  ✅ Seeded ${creditors.length} creditors for ${org.name}`, 'green');
  }

  return creditorsByOrg;
}
