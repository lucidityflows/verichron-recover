/**
 * Phone number category/type classification for organizations
 */
export enum PhoneCategory {
  /**
   * Mobile/cell phone number
   */
  MOBILE = 'MOBILE',

  /**
   * Home/residential phone number
   */
  HOME = 'HOME',

  /**
   * Work/business phone number
   */
  WORK = 'WORK',

  /**
   * Business/office main line
   */
  BUSINESS = 'BUSINESS',

  /**
   * Fax number
   */
  FAX = 'FAX',

  /**
   * Other/unclassified phone number
   */
  OTHER = 'OTHER',
}
