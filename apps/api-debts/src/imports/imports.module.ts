import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportsService } from './services/imports.service';
import { ImportsProcessor } from './services/imports.processor';
import { ImportsController } from './imports.controller';
import { ImportJob } from './entities/import-job.entity';
import { Debt } from '../debts/entities/debt.entity';
import { Portfolio } from '../portfolios/entities/portfolio.entity';
import { MockParserService } from './parsers/mock-parser.service';
import { VertexAiParserService } from './parsers/vertex-ai-parser.service';
import { CsvParserService } from './parsers/csv-parser.service';
import { IImportParser } from '@verichron/contracts';
import { EventsModule } from '../events/events.module';
import { CreditorsModule } from '../creditors/creditors.module';

/**
 * Module for portfolio and debt import functionality.
 *
 * **Provides:**
 * - ImportsController: Handles file upload endpoint (3 endpoints)
 * - ImportsService: Orchestrates job lifecycle and file storage
 * - ImportsProcessor: Handles file parsing and database transactions using parser abstraction
 * - IMPORT_PARSER: Environment-based parser selection (CSV, Mock vs Vertex AI Document AI)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ImportJob, Debt, Portfolio]),
    CreditorsModule,
    EventsModule,
  ],
  controllers: [ImportsController],
  providers: [
    ImportsService,
    ImportsProcessor,
    MockParserService,
    VertexAiParserService,
    CsvParserService,
    {
      provide: 'IMPORT_PARSER',
      useFactory: (
        configService: ConfigService,
        mockParser: MockParserService,
        vertexAiParser: VertexAiParserService,
        csvParser: CsvParserService,
      ): IImportParser => {
        const useEmulator = configService.get<string>('DOCUMENT_AI_EMULATOR') === 'true';

        // Custom multi-parser selector
        return {
          name: 'multi-parser-orchestrator',
          supportedExtensions: ['.csv', '.txt', '.pdf', '.jpg', '.png'],
          parse: async (fileContent: Buffer, filename: string, options?: { columnMapping?: Record<string, string> }) => {
            if (filename.toLowerCase().endsWith('.csv') || filename.toLowerCase().endsWith('.txt')) {
              return csvParser.parse(fileContent, filename, options);
            }
            return useEmulator 
              ? mockParser.parse(fileContent, filename, options) 
              : vertexAiParser.parse(fileContent, filename, options);
          },

          inspect: async (fileContent: Buffer, filename: string) => {
            if (filename.toLowerCase().endsWith('.csv') || filename.toLowerCase().endsWith('.txt')) {
              return csvParser.inspect(fileContent, filename);
            }
            return useEmulator 
              ? mockParser.inspect(fileContent, filename) 
              : vertexAiParser.inspect(fileContent, filename);
          }
        } as IImportParser;
      },
      inject: [ConfigService, MockParserService, VertexAiParserService, CsvParserService],
    },
  ],
  exports: [ImportsService],
})
export class ImportsModule {}
