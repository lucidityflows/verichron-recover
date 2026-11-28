import { IResponsivenessGeographicStateData } from './responsiveness-geographic-state-data.interface';

export interface IGeographicResponsivenessAnalytics {
  type: 'responsiveness';
  totalContacted: number;
  responsive: number;
  unresponsive: number;
  states: IResponsivenessGeographicStateData[];
}
