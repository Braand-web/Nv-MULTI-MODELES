import type { UserType } from "@/app/(auth)/auth";

type Entitlements = {
  maxMessagesPerHour: number;
};

export type PlanId = "free" | "pro" | "elite";

type PlanEntitlements = Entitlements & {
  label: string;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest: {
    maxMessagesPerHour: 10,
  },
  regular: {
    maxMessagesPerHour: 10,
  },
};

export const entitlementsByPlan: Record<PlanId, PlanEntitlements> = {
  free: {
    label: "Gratuit",
    maxMessagesPerHour: 10,
  },
  pro: {
    label: "Pro",
    maxMessagesPerHour: 50,
  },
  elite: {
    label: "Elite",
    maxMessagesPerHour: 200,
  },
};

export function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === "pro" || plan === "elite") {
    return plan;
  }

  return "free";
}
