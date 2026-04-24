import type { Plan } from "./types";

export const MESSAGE_LIMITS: Record<Plan, number> = {
  free: 1,
  basic: 30,
  premium: 50,
};

export const THROTTLE_SECONDS: Record<Plan, number> = {
  free: 15,
  basic: 5,
  premium: 2,
};

export function remainingMessages(plan: Plan, used: number): number {
  const limit = MESSAGE_LIMITS[plan];
  return Math.max(0, limit - used);
}

export function planLabel(plan: Plan): string {
  return { free: "Grátis", basic: "Basic", premium: "Premium" }[plan];
}
