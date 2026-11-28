import { IDebtAgeGeographicStateData } from './debt-age-geographic-state-data.interface';

export interface IGeographicDebtAgeAnalytics {
  type: 'debt-age';
  states: IDebtAgeGeographicStateData[];
}
