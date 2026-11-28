import { 
  BankruptcyType,
  EducationLevel,
  EmploymentStatus,
  MaritalStatus,
  Race,
  Sex
} from '@verichron/enums';

export interface ICreateDemographics {
  // SSN
  ssnEncrypted?: string;
  ssnLastFour?: string;

  // Personal Demographics
  sex?: Sex;
  race?: Race;
  maritalStatus?: MaritalStatus;
  dependents?: number;

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

  // Additional Demographics
  veteranStatus?: boolean;
  primaryLanguage?: string;
  hasDisability?: boolean;
}
