import { useQuery } from '@tanstack/react-query';
import { complianceControllerCheckCompliance } from '../../api/generated/communications/endpoints/compliance/compliance.js';
import { type CommunicationType } from '../../api/generated/communications_models/index.js';

interface UseComplianceCheckOptions {
  debtorId: string;
  communicationType: CommunicationType;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * useComplianceCheck
 * 
 * Proactively checks if a communication action (CALL, SMS, EMAIL) is compliant
 * before the user attempts to perform it.
 * 
 * Wraps the api-communications /compliance/check endpoint.
 */
export function useComplianceCheck({
  debtorId,
  communicationType,
  enabled = true,
  refetchInterval = 60000, // Default to checking every minute
}: UseComplianceCheckOptions) {
  return useQuery({
    queryKey: ['compliance-check', debtorId, communicationType],
    queryFn: async () => {
      const response = await complianceControllerCheckCompliance({
        debtorId,
        communicationType,
      });
      return response.data;
    },
    enabled: enabled && !!debtorId,
    refetchInterval,
    staleTime: 30000,
  });
}
