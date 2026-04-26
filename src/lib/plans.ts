import type { Plan } from "./types";

// Limites MENSAIS de mensagens no chat com ATB
// (free continua diario - 1 mensagem/dia para tentar engajar e converter)
export const MESSAGE_LIMITS_MONTH: Record<Plan, number> = {
  free: 1,        // 1/dia (tratado separadamente)
  basic: 30,      // 30/mes
  premium: 100,   // 100/mes
};

// Compat: usado por codigo legado
export const MESSAGE_LIMITS = MESSAGE_LIMITS_MONTH;

// Throttle entre mensagens (anti-spam)
export const THROTTLE_SECONDS: Record<Plan, number> = {
  free: 15,
  basic: 5,
  premium: 2,
};

// Plano free continua com limite diario (1/dia) — incentiva conversao
export const DAILY_LIMIT_FREE = 1;

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
