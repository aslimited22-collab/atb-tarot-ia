import type { Plan } from "./types";

export const MESSAGE_LIMITS: Record<Plan, number> = {
  free: 3,
  basic: 20,
  premium: Infinity,
};

export function remainingMessages(plan: Plan, used: number): number {
  const limit = MESSAGE_LIMITS[plan];
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - used);
}

export function planLabel(plan: Plan): string {
  return { free: "Grátis", basic: "Basic", premium: "Premium" }[plan];
}
