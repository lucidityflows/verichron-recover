import { MongoClient, Db } from 'mongodb';
import { log } from '../../helpers/logger';
import { CommunicationType, CommunicationStatus } from '@verichron/enums';
import { DebtorInfo } from './debtors.seed';

/**
 * Seed Communication Logs for Collector Analytics
 *
 * Creates realistic communication logs in MongoDB for testing the
 * collector statistics feature in the UI.
 */
export async function seedCommunicationLogs(
  mongoUri: string,
  organizations: Array<{ id: string; name: string }>,
  collectors: Array<{ userId: string; organizationId: string; name: string }>,
  debtorMap: Map<string, DebtorInfo[]>
): Promise<void> {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('communications');
    const logsCollection = db.collection('communication_logs');

    // Clear existing logs
    await logsCollection.deleteMany({});
    log('  -> Cleared existing communication logs', 'cyan');

    const now = new Date();
    const logs: any[] = [];

    // Generate logs for each collector
    for (const collector of collectors) {
      const orgDebtors = debtorMap.get(collector.organizationId) || [];

      if (orgDebtors.length === 0) {
        log(`  -> Skipping ${collector.name} - no debtors in organization`, 'yellow');
        continue;
      }

      // Generate 30-50 communications per collector over the last 30 days
      const communicationCount = 30 + Math.floor(Math.random() * 21); // 30-50

      for (let i = 0; i < communicationCount; i++) {
        // Pick a random debtor from this organization
        const debtor = orgDebtors[Math.floor(Math.random() * orgDebtors.length)];

        // Random communication type (weighted towards EMAIL and CALL)
        const typeRand = Math.random();
        let type: CommunicationType;
        if (typeRand < 0.4) {
          type = CommunicationType.EMAIL;
        } else if (typeRand < 0.7) {
          type = CommunicationType.CALL;
        } else if (typeRand < 0.85) {
          type = CommunicationType.SMS;
        } else {
          type = CommunicationType.LETTER;
        }

        // Random status (weighted towards successful communications)
        const statusRand = Math.random();
        let status: CommunicationStatus;
        let deliveredAt: Date | undefined;
        let openedAt: Date | undefined;
        let clickedAt: Date | undefined;

        if (type === CommunicationType.CALL) {
          // Calls are always SENT (manual logging)
          status = CommunicationStatus.SENT;
        } else {
          if (statusRand < 0.7) {
            // 70% delivered successfully
            status = CommunicationStatus.DELIVERED;
            deliveredAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);

            // 50% of delivered emails are opened
            if (type === CommunicationType.EMAIL && Math.random() < 0.5) {
              openedAt = new Date(deliveredAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);

              // 20% of opened emails have clicks
              if (Math.random() < 0.2) {
                clickedAt = new Date(openedAt.getTime() + Math.random() * 60 * 60 * 1000);
                status = CommunicationStatus.CLICKED;
              } else {
                status = CommunicationStatus.OPENED;
              }
            }
          } else if (statusRand < 0.85) {
            // 15% sent but not confirmed delivered
            status = CommunicationStatus.SENT;
          } else {
            // 15% failed
            status = CommunicationStatus.FAILED;
          }
        }

        // Random date within last 30 days (more recent = more likely)
        const daysAgo = Math.floor(Math.random() * Math.random() * 30); // Weighted towards recent
        const sentAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        // Build the log entry
        const log: any = {
          organizationId: collector.organizationId,
          debtorId: debtor.id,
          collectorUserId: collector.userId,
          type,
          status,
          provider: type === CommunicationType.EMAIL ? 'sendgrid' :
                   type === CommunicationType.SMS ? 'twilio' :
                   type === CommunicationType.LETTER ? 'lob' : 'mock',
          sentAt,
          statusHistory: [
            {
              status,
              timestamp: sentAt,
              metadata: { source: 'e2e-seed' },
            },
          ],
          metadata: {
            seedData: true,
            collectorName: collector.name,
          },
          createdAt: sentAt,
          updatedAt: sentAt,
        };

        // Add optional fields
        if (deliveredAt) log.deliveredAt = deliveredAt;
        if (openedAt) log.openedAt = openedAt;
        if (clickedAt) log.clickedAt = clickedAt;

        // Add content based on type
        if (type === CommunicationType.EMAIL) {
          log.content = {
            subject: 'Payment Reminder - Account Update',
            body: '<p>Dear Customer, this is a reminder about your outstanding balance.</p>',
          };
          log.templateName = 'payment-reminder';
        } else if (type === CommunicationType.SMS) {
          log.content = {
            body: 'Payment reminder: Please contact us regarding your account.',
          };
          log.templateName = 'sms-reminder';
        } else if (type === CommunicationType.CALL) {
          log.content = {
            body: 'Outbound collection call - spoke with debtor about payment options',
          };
        } else if (type === CommunicationType.LETTER) {
          log.content = {
            body: 'Formal notice regarding outstanding balance',
          };
          log.templateName = 'formal-notice';
        }

        logs.push(log);
      }

      log(`  -> Generated ${communicationCount} communications for ${collector.name}`, 'cyan');
    }

    // Insert all logs
    if (logs.length > 0) {
      await logsCollection.insertMany(logs);
      log(`✅ Inserted ${logs.length} communication logs into MongoDB`, 'green');
    } else {
      log('⚠️  No communication logs to insert', 'yellow');
    }

    // Create indexes (matching production)
    await logsCollection.createIndex({ organizationId: 1, debtorId: 1, sentAt: -1 });
    await logsCollection.createIndex({ providerMessageId: 1 });
    await logsCollection.createIndex({ status: 1, sentAt: -1 });
    await logsCollection.createIndex({ organizationId: 1, sentAt: -1 });
    await logsCollection.createIndex({ organizationId: 1, type: 1, sentAt: -1 });
    await logsCollection.createIndex({ organizationId: 1, collectorUserId: 1, sentAt: -1 });
    log('  -> Created MongoDB indexes for communication logs', 'cyan');

  } finally {
    await client.close();
  }
}
