import { PartialType } from '@nestjs/swagger';
import { CreateAutoAssignmentDto } from './create-auto-assignment.dto';

export class UpdateAutoAssignmentDto extends PartialType(CreateAutoAssignmentDto) {}
