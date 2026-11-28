import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalAnalyticsController } from './analytics.internal.controller';
import { InternalAnalyticsService } from './analytics.service';
import { Debt } from '../../debts/entities/debt.entity';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Debt, Portfolio])],
  controllers: [InternalAnalyticsController],
  providers: [InternalAnalyticsService],
  exports: [InternalAnalyticsService],
})
export class InternalAnalyticsModule {}
