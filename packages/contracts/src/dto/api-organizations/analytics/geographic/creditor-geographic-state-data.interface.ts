import { IBaseGeographicStateData } from './base-geographic-state-data.interface';
import { ITopCreditor } from './top-creditor.interface';

export interface ICreditorGeographicStateData extends IBaseGeographicStateData {
  creditorCount: number;
  totalDebtValue: number;
  averageDebtValue: number;
  topCreditors: ITopCreditor[];
}
