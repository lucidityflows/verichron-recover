import { GeographicAnalyticsView } from '@verichron/enums';
import { ICreditorGeographicStateData } from './creditor-geographic-state-data.interface';

export interface IGeographicCreditorAnalytics {
  type: GeographicAnalyticsView.CREDITORS;
  totalCreditors: number;
  totalDebtValue: number;
  states: ICreditorGeographicStateData[];
}
