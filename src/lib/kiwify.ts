import crypto from "crypto";
import type { Plan } from "./types";

export function verifyKiwifySignature(raw: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.KIWIFY_WEBHOOK_SECRET || "";
  if (!secret) return false;
  const expected = crypto.createHmac("sha1", secret).update(raw).digest("hex");
  try {
    // Compara como bytes hex decodificados — se comprimentos diferirem
    // timingSafeEqual joga RangeError. Validamos antes pra ser explicito.
    const expectedBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length === 0 || expectedBuf.length !== sigBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

export function planFromValue(valueBRL: number): Plan {
  return valueBRL <= 35 ? "basic" : "premium";
}
