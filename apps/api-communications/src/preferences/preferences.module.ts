import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';
import { DebtorPreference } from './entities/debtor-preference.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DebtorPreference])],
  providers: [PreferencesService],
  controllers: [PreferencesController],
  exports: [PreferencesService],
})
export class PreferencesModule {}