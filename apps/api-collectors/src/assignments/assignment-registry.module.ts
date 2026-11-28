import { Module } from '@nestjs/common';
import { AssignmentRegistryService } from './assignment-registry.service';

@Module({
  providers: [AssignmentRegistryService],
  exports: [AssignmentRegistryService],
})
export class AssignmentRegistryModule {}
