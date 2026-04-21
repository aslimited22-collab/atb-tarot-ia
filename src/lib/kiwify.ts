import crypto from "crypto";
import type { Plan } from "./types";

export function verifyKiwifySignature(raw: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.KIWIFY_WEBHOOK_SECRET || "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function planFromValue(valueBRL: number): Plan {
  return valueBRL <= 35 ? "basic" : "premium";
}
