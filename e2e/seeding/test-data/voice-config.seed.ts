/**
 * Test Data: Voice Configuration
 *
 * Configures Twilio credentials for test organizations in api-voice.
 */

import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { log } from '../../helpers/logger';

/**
 * Replicates EncryptionService logic to seed encrypted credentials
 */
function encrypt(text: string, keyHex: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function seedVoiceConfig(
  voiceDataSource: DataSource,
  orgs: { id: string; name: string }[]
) {
  log('  📞 Seeding Twilio voice configurations...', 'cyan');

  const encryptionKey = process.env.API_VOICE_ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length !== 64) {
    log('    ⚠️ Skipping voice encryption: API_VOICE_ENCRYPTION_KEY missing or invalid.', 'yellow');
    return;
  }

  // Use master Twilio credentials from environment for all test orgs
  const accountSid = process.env.TWILIO_VOICE_ACCOUNT_SID || 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const authToken = process.env.TWILIO_VOICE_AUTH_TOKEN || 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const apiKeySid = process.env.TWILIO_VOICE_API_KEY_SID || 'SKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const apiKeySecret = process.env.TWILIO_VOICE_API_KEY_SECRET || 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const outgoingAppSid = process.env.TWILIO_VOICE_OUTGOING_APP_SID || 'APXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  // Encrypt sensitive fields
  const encryptedAuthToken = encrypt(authToken, encryptionKey);
  const encryptedApiKeySecret = encrypt(apiKeySecret, encryptionKey);

  for (const org of orgs) {
    // Check if config already exists
    const existing = await voiceDataSource.query(
      `SELECT id FROM twilio_configs WHERE organization_id = $1`,
      [org.id]
    );

    if (!existing || existing.length === 0) {
      await voiceDataSource.query(
        `INSERT INTO twilio_configs (
          organization_id, 
          account_sid, 
          auth_token, 
          api_key_sid, 
          api_key_secret, 
          outgoing_application_sid,
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [org.id, accountSid, encryptedAuthToken, apiKeySid, encryptedApiKeySecret, outgoingAppSid]
      );
      log(`    ✅ Configured (Encrypted) Twilio for: ${org.name}`, 'reset');
    }
  }

  log('  ✅ Voice configurations ready', 'green');
}
