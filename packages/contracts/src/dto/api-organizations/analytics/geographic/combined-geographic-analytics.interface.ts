import { IGeographicDebtorAnalytics } from './geographic-debtor-analytics.interface';
import { IGeographicCreditorAnalytics } from './geographic-creditor-analytics.interface';
import { IGeographicFlow } from './geographic-flow.interface';

export interface ICombinedGeographicAnalytics {
  debtors: IGeographicDebtorAnalytics;
  creditors: IGeographicCreditorAnalytics;
  flows: IGeographicFlow[];
}
