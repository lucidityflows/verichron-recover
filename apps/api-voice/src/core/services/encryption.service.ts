import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly ivLength = 16;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('API_VOICE_ENCRYPTION_KEY');
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    if (!secret || secret.length !== 64) {
      if (isProduction) {
        this.logger.error('API_VOICE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
        throw new InternalServerErrorException('Encryption key is not configured correctly.');
      } else {
        this.logger.warn('API_VOICE_ENCRYPTION_KEY is missing or invalid. Using dummy key for non-production bootstrap.');
        // Use a dummy 32-byte key (64 hex chars) for non-prod bootstrap
        this.key = Buffer.alloc(32, 'verichron-dummy-key-for-bootstrap-only');
        return;
      }
    }
    this.key = Buffer.from(secret, 'hex');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(text: string): string {
    const parts = text.split(':');
    if (parts.length !== 2) {
      this.logger.error('Invalid encrypted text format.');
      throw new InternalServerErrorException('Failed to decrypt data.');
    }
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
