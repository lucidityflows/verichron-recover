import { IBaseGeographicStateData } from './base-geographic-state-data.interface';

export interface IDebtorGeographicStateData extends IBaseGeographicStateData {
  debtorCount: number;
  totalDebtValue: number;
  averageDebtValue: number;
  activeDebts: number;
  paidDebts: number;
  defaultedDebts: number;
  recoveryRate: number;
}
