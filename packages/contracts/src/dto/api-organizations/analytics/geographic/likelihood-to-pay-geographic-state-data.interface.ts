import { IBaseGeographicStateData } from './base-geographic-state-data.interface';

export interface ILikelihoodToPayGeographicStateData extends IBaseGeographicStateData {
  debtorCount: number;
  averageLikelihoodScore: number;
  highLikelihood: number;
  mediumLikelihood: number;
  lowLikelihood: number;
  totalDebtValueHighLikelihood: number;
  projectedRecovery: number;
}
