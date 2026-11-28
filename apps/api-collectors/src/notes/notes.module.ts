import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectorNoteController } from './notes.controller';
import { CollectorNoteService } from './notes.service';
import { CollectorNote } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectorNote,
    ]),
  ],
  controllers: [CollectorNoteController],
  providers: [CollectorNoteService],
  exports: [CollectorNoteService],
})
export class CollectorNoteModule {}
