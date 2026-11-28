import { IBaseGeographicStateData } from './base-geographic-state-data.interface';

export interface IDefaultRiskGeographicStateData extends IBaseGeographicStateData {
  debtorCount: number;
  averageDefaultRiskScore: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  totalDebtValueAtRisk: number;
  projectedLoss: number;
  recentDefaultRate: number;
  activeDefaultCount: number;
}
