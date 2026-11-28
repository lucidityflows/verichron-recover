import { StateAbbreviation } from '@verichron/enums';

export interface IGeographicFlow {
  originState: StateAbbreviation;
  destinationState: StateAbbreviation;
  debtValue: number;
  debtCount: number;
}
