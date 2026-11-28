import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for debtor ownership validation
 */
export const DEBTOR_OWNERSHIP_KEY = 'debtorOwnership';

/**
 * Decorator to enforce debtor ownership validation
 *
 * Use this on debtor-specific endpoints to ensure the debtor can only access
 * their own data. This works in conjunction with DebtorOwnershipGuard.
 *
 * The guard will validate that:
 * 1. The user has UserType.DEBTOR
 * 2. The userId in the JWT matches the resource owner
 * 3. For multi-org queries, organizationIds in token limit scope
 *
 * @example
 * ```typescript
 * @Get('my-debts')
 * @DebtorOwnership()
 * @Permissions(DebtorPermission.SELF_READ)
 * async getMyDebts(@Req() request: Request) {
 *   const debtorContext = request.activeContext as DebtorContext;
 *   return this.debtsService.findDebtsForDebtor(
 *     debtorContext.userId,
 *     debtorContext.organizationIds
 *   );
 * }
 * ```
 *
 * @example With path params
 * ```typescript
 * @Get('my-debts/:debtId')
 * @DebtorOwnership()
 * @Permissions(DebtorPermission.SELF_READ)
 * async getDebtDetails(
 *   @Param('debtId') debtId: string,
 *   @Req() request: Request
 * ) {
 *   const debtorContext = request.activeContext as DebtorContext;
 *   // Guard ensures this debt belongs to this debtor
 *   return this.debtsService.findDebtForDebtor(debtId, debtorContext.userId);
 * }
 * ```
 */
export const DebtorOwnership = () => SetMetadata(DEBTOR_OWNERSHIP_KEY, true);
