import { Module, Global } from '@nestjs/common';
import { RequestContext } from './services/request-context.service';
import { EncryptionService } from './services/encryption.service';

/**
 * CoreModule
 *
 * Global module that provides core services available throughout the application.
 * Marked as @Global so it doesn't need to be imported into every module.
 *
 * Exports:
 * - RequestContext: Request-scoped service for accessing authenticated user/org context
 * - EncryptionService: Service for encrypting and decrypting sensitive data
 */
@Global()
@Module({
  providers: [RequestContext, EncryptionService],
  exports: [RequestContext, EncryptionService],
})
export class CoreModule {}

