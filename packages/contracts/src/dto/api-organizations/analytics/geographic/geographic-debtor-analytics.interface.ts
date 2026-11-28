import { GeographicAnalyticsView } from '@verichron/enums';
import { IDebtorGeographicStateData } from './debtor-geographic-state-data.interface';

export interface IGeographicDebtorAnalytics {
  type: GeographicAnalyticsView.DEBTORS;
  totalDebtors: number;
  totalDebtValue: number;
  states: IDebtorGeographicStateData[];
}
