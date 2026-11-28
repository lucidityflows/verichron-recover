import { OrganizationStatus, OnboardingStep } from "@verichron/enums";

export interface IOnboardingStatusResponse {
  orgId: string;
  orgName: string;
  status: OrganizationStatus;
  completedSteps: OnboardingStep[];
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}
