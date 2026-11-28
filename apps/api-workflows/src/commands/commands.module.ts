import { Module } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { EventPublisherModule } from '@verichron/event-publisher';

@Module({
  imports: [EventPublisherModule],
  providers: [CommandsService],
  exports: [CommandsService],
})
export class CommandsModule {}
