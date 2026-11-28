import { IBaseGeographicStateData } from './base-geographic-state-data.interface';
import { IAgeBucket } from './age-bucket.interface';
import { IRecoveryRateByAge } from './recovery-rate-by-age.interface';

export interface IDebtAgeGeographicStateData extends IBaseGeographicStateData {
  age0to30: IAgeBucket;
  age31to60: IAgeBucket;
  age61to90: IAgeBucket;
  age91to180: IAgeBucket;
  age180to365: IAgeBucket;
  age365plus: IAgeBucket;
  totalDebts: number;
  totalDebtValue: number;
  averageDebtAge: number;
  recoveryRateByAge: IRecoveryRateByAge;
}
