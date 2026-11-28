import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AutoAssignmentService } from './auto-assignment.service';
import { AutoAssignmentExecutorService } from './auto-assignment-executor.service';
import { AssignmentRefinementService } from './assignment-refinement.service';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [AutoAssignmentService, AutoAssignmentExecutorService, AssignmentRefinementService],
  exports: [AutoAssignmentService],
})
export class AutoAssignmentModule {}
