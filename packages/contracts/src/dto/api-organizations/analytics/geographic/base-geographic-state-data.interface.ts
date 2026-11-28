import { ICoordinates } from './coordinates.interface';
import { StateAbbreviation } from '@verichron/enums';

export interface IBaseGeographicStateData {
  stateCode: StateAbbreviation;
  stateName: string;
  coordinates: ICoordinates;
}
