import type { Plan } from "./types";

// Limites MENSAIS de mensagens no chat com ATB
// (free não tem mais mensagens — incentiva conversão direto, sem trial diluído)
export const MESSAGE_LIMITS_MONTH: Record<Plan, number> = {
  free: 0,        // sem mensagens — exige upgrade
  basic: 30,      // 30/mes
  premium: 100,   // 100/mes
};

// Compat: usado por codigo legado
export const MESSAGE_LIMITS = MESSAGE_LIMITS_MONTH;

// Throttle entre mensagens (anti-spam)
export const THROTTLE_SECONDS: Record<Plan, number> = {
  free: 0,        // irrelevante — free não envia
  basic: 5,
  premium: 2,
};

// Plano free SEM cota diária — toda mensagem exige plano pago.
export const DAILY_LIMIT_FREE = 0;

export function planLabel(plan: Plan): string {
  // "free" no DB = conta criada sem pagamento confirmado.
  // No UI mostramos como "Sem plano" pra ser honesto (nada de graça no produto).
  return { free: "Sem plano", basic: "Basic", premium: "Premium" }[plan];
}

/**
 * `true` se o usuário tem um plano pago ativo (basic ou premium).
 * Use isso pra portões de funcionalidades em vez de checar `plan !== "free"`.
 */
export function isPaidPlan(plan: Plan): boolean {
  return plan === "basic" || plan === "premium";
}

// Helpers para periodo
export function currentMonthKey(date: Date = new Date()): string {
  // Formato YYYY-MM em UTC para evitar variacao por timezone
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
