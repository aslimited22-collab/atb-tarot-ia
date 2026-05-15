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
  return { free: "Grátis", basic: "Basic", premium: "Premium" }[plan];
}

// Helpers para periodo
export function currentMonthKey(date: Date = new Date()): string {
  // Formato YYYY-MM em UTC para evitar variacao por timezone
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
