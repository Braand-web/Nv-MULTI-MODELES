import type { PlanId } from "@/lib/ai/entitlements";

export type BillingProduct = {
  credits: number;
  id: string;
  intervalDays?: number;
  kind: "credits" | "plan";
  label: string;
  plan?: PlanId;
  priceXaf: number;
  recommended?: boolean;
};

export const creditPacks: BillingProduct[] = [
  {
    credits: 500,
    id: "credits-starter",
    kind: "credits",
    label: "Découverte",
    priceXaf: 500,
  },
  {
    credits: 1_500,
    id: "credits-growth",
    kind: "credits",
    label: "Essentiel",
    priceXaf: 1_500,
    recommended: true,
  },
  {
    credits: 6_000,
    id: "credits-scale",
    kind: "credits",
    label: "Intensif",
    priceXaf: 5_000,
  },
];

export const subscriptionPlans: BillingProduct[] = [
  {
    credits: 1_500,
    id: "plan-pro-monthly",
    intervalDays: 30,
    kind: "plan",
    label: "Pro",
    plan: "pro",
    priceXaf: 5_000,
    recommended: true,
  },
  {
    credits: 6_000,
    id: "plan-elite-monthly",
    intervalDays: 30,
    kind: "plan",
    label: "Elite",
    plan: "elite",
    priceXaf: 15_000,
  },
];

const products = [...creditPacks, ...subscriptionPlans];

export function getBillingProduct(productId: string) {
  return products.find((product) => product.id === productId);
}
