import { ILikelihoodToPayGeographicStateData } from './likelihood-to-pay-geographic-state-data.interface';

export interface IGeographicLikelihoodToPayAnalytics {
  type: 'likelihood-to-pay';
  averageLikelihoodScore: number;
  states: ILikelihoodToPayGeographicStateData[];
}
