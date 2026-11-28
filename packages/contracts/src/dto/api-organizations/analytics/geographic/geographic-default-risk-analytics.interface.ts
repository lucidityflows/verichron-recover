import { IDefaultRiskGeographicStateData } from './default-risk-geographic-state-data.interface';

export interface IGeographicDefaultRiskAnalytics {
  type: 'default-risk';
  averageDefaultRisk: number;
  states: IDefaultRiskGeographicStateData[];
}
