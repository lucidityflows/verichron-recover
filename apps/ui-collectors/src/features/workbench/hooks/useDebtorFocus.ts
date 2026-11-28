import { useUserStore } from '@/shared/store/userStore';
import { useWorkstationControllerGetDebtorFocus } from '@/api/generated/collectors/endpoints/collector-workstation/collector-workstation';

/**
 * useDebtorFocus
 * Fetches 360° debtor view for the Workbench
 *
 * Returns:
 * - Debtor profile (name, contact info, risk level)
 * - All debts for this debtor
 * - Timeline of interactions (calls, payments, promises)
 * - Compliance flags (FDCPA warnings)
 * - Smart suggestions (next best action)
 *
 * This is the "deep work" data that powers Focus Mode.
 */
export const useDebtorFocus = (debtorId: string) => {
  const { organizationId } = useUserStore();

  return useWorkstationControllerGetDebtorFocus(organizationId!, debtorId, {
    query: {
      enabled: !!organizationId && !!debtorId,
      staleTime: 60 * 1000, // 1 minute - this is "deep work" data, doesn't change rapidly
    },
  });
};
