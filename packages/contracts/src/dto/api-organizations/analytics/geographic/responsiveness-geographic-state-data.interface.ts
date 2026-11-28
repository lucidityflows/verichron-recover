import { IBaseGeographicStateData } from './base-geographic-state-data.interface';

export interface IResponsivenessGeographicStateData extends IBaseGeographicStateData {
  totalDebtorsContacted: number;
  responsiveDebtors: number;
  unresponsiveDebtors: number;
  responsivenessRate: number;
  averageContactAttempts: number;
  averageResponseTime: number;
  preferredContactMethod: 'phone' | 'email' | 'sms' | 'mail';
}
