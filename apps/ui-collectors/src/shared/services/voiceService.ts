/**
 * Voice Service
 * File: apps/ui-organizations/src/shared/services/voiceService.ts
 * 
 * Service for Voice/Telephony API operations using Twilio.
 * Provides methods to manage Twilio configuration, initiate calls,
 * retrieve call history, and generate authentication tokens for the softphone.
 * 
 * Note: The organizationId is inferred from the JWT token by the backend,
 * so it doesn't need to be passed explicitly in most cases.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
// Import Orval-generated functions
import {
  twilioConfigControllerCreate,
  twilioConfigControllerFindOne,
  twilioConfigControllerUpdate,
  twilioConfigControllerRemove,
} from '../../api/generated/voice/endpoints/voice-configuration/voice-configuration';

import {
  callsControllerInitiateCall,
  callsControllerGetCallHistory,
} from '../../api/generated/voice/endpoints/voice-calls/voice-calls';

import {
  tokensControllerGenerateToken,
} from '../../api/generated/voice/endpoints/voice-tokens/voice-tokens';

// Import DTOs from generated models
import type {
  CreateTwilioConfigDto,
  UpdateTwilioConfigDto,
  TwilioConfigResponseDto,
  InitiateCallDto,
} from '../../api/generated/voice_models';

/* eslint-disable @typescript-eslint/no-unused-vars */
import { getCurrentOrganizationId } from '../utils/auth';

export interface TokenResponseDto {
  token: string;
  identity: string;
  expiresAt: string;
}

export interface CallHistoryRecordDto {
  id: string;
  sid: string;
  from: string;
  to: string;
  status: string;
  duration: number;
  startTime: string;
  endTime: string;
  direction: 'inbound' | 'outbound';
}

/**
 * Voice Service for managing telephony operations
 * 
 * This service provides methods to:
 * - Configure Twilio credentials for an organization
 * - Initiate outbound calls to debtors
 * - Retrieve call history
 * - Generate authentication tokens for browser-based softphone
 */
export const voiceService = {
  // ============================================================================
  // Twilio Configuration Management
  // ============================================================================

  /**
   * Get the current Twilio configuration for the organization.
   * Returns the Twilio Account SID, API Key SID, and Application SID (Auth Token is never returned).
   * 
   * @param config - Optional request configuration
   * @returns Promise with Twilio configuration details
   * @throws Error if no configuration exists
   */
  getTwilioConfig: async (config?: RequestInit): Promise<TwilioConfigResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await twilioConfigControllerFindOne(orgId, config);
    return response.data;
  },

  /**
   * Create a new Twilio configuration for the organization.
   * This should be called during initial setup or when switching Twilio accounts.
   * 
   * IMPORTANT: Credentials are encrypted at rest and never returned in GET requests.
   * 
   * @param dto - Twilio credentials (Account SID, Auth Token, API Key SID/Secret, App SID)
   * @param config - Optional request configuration
   * @returns Promise with created configuration (credentials excluded)
   * @throws Error if configuration already exists (use update instead)
   */
  createTwilioConfig: async (
    dto: CreateTwilioConfigDto,
    config?: RequestInit,
  ): Promise<TwilioConfigResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await twilioConfigControllerCreate(orgId, dto, config);
    return response.data;
  },

  /**
   * Update the existing Twilio configuration for the organization.
   * Use this to rotate credentials or change the Twilio application.
   * 
   * @param dto - Updated Twilio credentials (all fields optional)
   * @param config - Optional request configuration
   * @returns Promise with updated configuration (credentials excluded)
   * @throws Error if no configuration exists (use create instead)
   */
  updateTwilioConfig: async (
    dto: UpdateTwilioConfigDto,
    config?: RequestInit,
  ): Promise<TwilioConfigResponseDto> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await twilioConfigControllerUpdate(orgId, dto, config);
    return response.data;
  },

  /**
   * Delete the Twilio configuration for the organization.
   * This will disable all voice functionality until a new configuration is created.
   * 
   * WARNING: This action cannot be undone. Existing call history will be preserved,
   * but no new calls can be made until reconfigured.
   * 
   * @param config - Optional request configuration
   * @returns Promise that resolves when deletion is complete
   */
  deleteTwilioConfig: async (config?: RequestInit): Promise<void> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    await twilioConfigControllerRemove(orgId, config);
  },

  // ============================================================================
  // Call Operations
  // ============================================================================

  /**
   * Initiate an outbound call to a debtor.
   * 
   * This triggers the Twilio API to place a call from the organization's
   * configured phone number to the debtor's phone number. The call will be
   * routed through Twilio's infrastructure and can be recorded/transcribed
   * based on organization settings.
   * 
   * The collector's browser-based softphone will ring, and once answered,
   * will be connected to the debtor.
   * 
   * @param dto - Call details (debtor ID and phone number)
   * @param config - Optional request configuration
   * @returns Promise that resolves when the call is initiated
   * @throws Error if Twilio configuration is missing or invalid phone number
   */
  initiateCall: async (
    dto: InitiateCallDto,
    config?: RequestInit,
  ): Promise<void> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await callsControllerInitiateCall(orgId, dto, config);
    return response.data;
  },

  /**
   * Get the complete call history for a specific debtor.
   * 
   * Returns all past calls, including:
   * - Call duration
   * - Call outcome (answered, no answer, busy, failed)
   * - Recording URL (if enabled)
   * - Timestamp
   * - Collector who made the call
   * 
   * This is useful for displaying in the Debtor Focus view to show
   * communication history.
   * 
   * @param debtorId - UUID of the debtor
   * @param config - Optional request configuration
   * @returns Promise with array of call records
   */
  getCallHistory: async (
    debtorId: string,
    config?: RequestInit,
  ): Promise<CallHistoryRecordDto[]> => {
    const orgId = getCurrentOrganizationId();
    if (!orgId) throw new Error('Organization ID not found');
    const response = await callsControllerGetCallHistory(orgId, debtorId, config);
    // Cast needed because OpenAPI spec doesn't properly define response schema
    return (response.data ?? []) as unknown as CallHistoryRecordDto[];
  },

  // ============================================================================
  // Softphone Token Generation
  // ============================================================================

  /**
   * Generate a Twilio capability token for the browser-based softphone.
   * 
   * This token is used to initialize the Twilio Client SDK in the browser,
   * allowing collectors to make and receive calls directly from the web interface.
   * 
   * The token:
   * - Is valid for 1 hour by default
   * - Contains the collector's identity (from JWT)
   * - Grants permission to make outbound calls
   * - Grants permission to receive incoming calls
   * 
   * USAGE:
   * 1. Call this method when initializing the softphone component
   * 2. Pass the token to Twilio.Device.setup()
   * 3. Refresh the token before expiration (implement auto-refresh)
   * 
   * @param config - Optional request configuration
   * @returns Promise with Twilio capability token
   */
  generateSoftphoneToken: async (config?: RequestInit): Promise<TokenResponseDto> => {
    const response = await tokensControllerGenerateToken(config);
    // Cast needed because OpenAPI spec doesn't properly define response schema
    return (response.data ?? { token: '' }) as unknown as TokenResponseDto;
  },

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Check if Twilio is configured for the current organization.
   * 
   * This is a convenience method to check if voice functionality is available
   * without causing an error. Useful for showing/hiding UI elements.
   * 
   * @param config - Optional request configuration
   * @returns Promise resolving to true if configured, false otherwise
   */
  isTwilioConfigured: async (config?: RequestInit): Promise<boolean> => {
    try {
      await voiceService.getTwilioConfig(config);
      return true;
    } catch (error) {
      // 404 means no configuration exists
      return false;
    }
  },
};