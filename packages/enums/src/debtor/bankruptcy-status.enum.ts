/**
 * Debtor bankruptcy status
 * Critical for FDCPA compliance
 */
export enum BankruptcyStatus {
  /**
   * No bankruptcy filing
   */
  NONE = 'NONE',

  /**
   * Chapter 7 bankruptcy (liquidation)
   */
  CHAPTER_7 = 'CHAPTER_7',

  /**
   * Chapter 11 bankruptcy (reorganization)
   */
  CHAPTER_11 = 'CHAPTER_11',

  /**
   * Chapter 13 bankruptcy (wage earner plan)
   */
  CHAPTER_13 = 'CHAPTER_13',

  /**
   * Bankruptcy discharged - debt eliminated
   */
  DISCHARGED = 'DISCHARGED',

  /**
   * Bankruptcy dismissed - can resume collection
   */
  DISMISSED = 'DISMISSED',

  /**
   * Bankruptcy pending - automatic stay in effect
   */
  PENDING = 'PENDING',
}
