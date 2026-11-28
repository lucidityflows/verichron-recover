import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { ProfilesModule } from '../profiles/profiles.module';
import { EventsModule } from '../events';

/**
 * Documents Module
 * 
 * Manages debtor-specific documents with Google Cloud Storage integration.
 * 
 * Key features:
 * - File upload to GCS
 * - Signed URL generation for secure downloads
 * - Document metadata management
 * - File type and size validation
 * - Access control verification via ProfilesModule
 * 
 * GCS Structure:
 * gs://{bucket}/{organizationId}/{debtorId}/{documentId}-{filename}
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    ProfilesModule, // Import to access ProfilesService for verification
    EventsModule
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService], // Export for use by other modules
})
export class DocumentsModule {}