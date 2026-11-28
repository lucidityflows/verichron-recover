/**
 * Address category/type classification for organizations
 */
export enum AddressCategory {
  /**
   * Primary residence address
   */
  RESIDENCE_PRIMARY = 'RESIDENCE_PRIMARY',

  /**
   * Secondary residence address
   */
  RESIDENCE_SECONDARY = 'RESIDENCE_SECONDARY',

  /**
   * Place of employment address
   */
  PLACE_OF_EMPLOYMENT = 'PLACE_OF_EMPLOYMENT',

  /**
   * Relative's address
   */
  RELATIVE = 'RELATIVE',

  /**
   * PO Box address
   */
  PO_BOX = 'PO_BOX',

  /**
   * Legal correspondence address
   */
  LEGAL_CORRESPONDENCE = 'LEGAL_CORRESPONDENCE',

  /**
   * Headquarters/Main office
   */
  HEADQUARTERS = 'HEADQUARTERS',

  /**
   * Branch office
   */
  BRANCH = 'BRANCH',
}
