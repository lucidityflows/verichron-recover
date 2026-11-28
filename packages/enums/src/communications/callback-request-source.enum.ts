/**
 * Callback Request Source Enum
 *
 * Indicates the channel through which a debtor requested a callback.
 * Used for tracking engagement patterns and routing callback tasks.
 */
export enum CallbackRequestSource {
  /**
   * Debtor replied to an email requesting a callback
   */
  EMAIL_REPLY = 'EMAIL_REPLY',

  /**
   * Debtor replied to an SMS requesting a callback
   */
  SMS_REPLY = 'SMS_REPLY',

  /**
   * Debtor selected callback option in IVR (Interactive Voice Response) system
   */
  IVR = 'IVR',

  /**
   * Debtor submitted callback request through self-service portal
   */
  PORTAL = 'PORTAL',

  /**
   * Debtor left a voicemail requesting callback
   */
  VOICEMAIL = 'VOICEMAIL',

  /**
   * Other/unknown callback request source
   */
  OTHER = 'OTHER',
}
