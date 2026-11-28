import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalAnalyticsController } from './analytics.internal.controller';
import { InternalAnalyticsService } from './analytics.service';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { DebtorAddress } from '../../profiles/entities/debtor-address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DebtorProfileEntity, DebtorAddress])],
  controllers: [InternalAnalyticsController],
  providers: [InternalAnalyticsService],
  exports: [InternalAnalyticsService],
})
export class InternalAnalyticsModule {}
