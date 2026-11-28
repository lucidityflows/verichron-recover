import { 
  BankruptcyType,
  EducationLevel,
  EmploymentStatus,
  MaritalStatus,
  Race,
  Sex
} from '@verichron/enums';

export interface IUpdateDemographics {
  // SSN
  ssnEncrypted?: string;
  ssnLastFour?: string;

  // Personal Demographics
  sex?: Sex;
  race?: Race;
  maritalStatus?: MaritalStatus;
  numberOfDependents?: number;
  preferredLanguage?: 'ENGLISH' | 'SPANISH' | 'FRENCH' | 'OTHER';

  // Financial Information
  annualIncome?: number;
  employmentStatus?: EmploymentStatus;
  employerName?: string;
  occupation?: string;
  educationLevel?: EducationLevel;

  // Credit History
  bankruptcyHistory?: boolean;
  bankruptcyDate?: string;
  bankruptcyType?: BankruptcyType;
  bankruptcyDischargeDate?: string;
}
