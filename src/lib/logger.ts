// Logger estruturado simples — escreve no console em formato JSON
// para que Vercel/Datadog/qualquer collector consiga indexar por campos.
//
// **LGPD**: mascaramos PII (e-mail, telefone, nome) automaticamente nos `extra`
// pra não vazar dados pessoais em logs.

type LogLevel = "info" | "warn" | "error";

const PII_KEYS = new Set([
  "email",
  "name",
  "phone",
  "whatsapp",
  "telefone",
  "cellphone",
  "celular",
  "address",
  "endereco",
  "cpf",
  "rg",
  "birth_date",
  "birthdate",
  "data_nascimento",
]);

function maskEmail(s: string): string {
  const match = s.match(/^([^@]+)@(.+)$/);
  if (!match) return "[redacted]";
  const local = match[1];
  const domainParts = match[2].split(".");
  const visible = local.slice(0, 1);
  const tld = domainParts[domainParts.length - 1];
  return `${visible}***@***.${tld}`;
}

function maskPhone(s: string): string {
  const digits = s.replace(/\D/g, "");
  if (digits.length < 4) return "[redacted]";
  const last2 = digits.slice(-2);
  return `***${last2}`;
}

function maskName(s: string): string {
  const parts = s.trim().split(/\s+/);
  if (parts.length === 0) return "[redacted]";
  return `${parts[0]} ***`;
}

function maskValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  const k = key.toLowerCase();
  if (typeof value !== "string") {
    // Recurse em objects/arrays
    if (Array.isArray(value)) return value.map((v, i) => maskValue(String(i), v));
    if (typeof value === "object") return redactPII(value as Record<string, unknown>);
    return value;
  }
  if (k === "email" && value.includes("@")) return maskEmail(value);
  if (k.includes("phone") || k.includes("whats") || k === "telefone" || k === "cellphone" || k === "celular") {
    return maskPhone(value);
  }
  if (k === "name" || k === "nome") return maskName(value);
  if (k === "cpf" || k === "rg") return "[redacted]";
  if (PII_KEYS.has(k)) return "[redacted]";
  return value;
}

/**
 * Mascara campos sensíveis (PII) em um objeto antes de logar.
 * Recursivo: percorre objetos aninhados e arrays.
 */
export function redactPII(obj: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return obj as any;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = maskValue(key, value);
  }
  return out;
}

function emit(level: LogLevel, scope: string, message: string, extra?: Record<string, unknown>) {
  const safeExtra = extra ? redactPII(extra) : undefined;
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...(safeExtra || {}),
  };
  let line: string;
  try {
    line = JSON.stringify(payload);
  } catch {
    line = JSON.stringify({ ...payload, _serializeFailed: true });
  }
  // eslint-disable-next-line no-console
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logInfo(scope: string, message: string, extra?: Record<string, unknown>) {
  emit("info", scope, message, extra);
}

export function logWarn(scope: string, message: string, extra?: Record<string, unknown>) {
  emit("warn", scope, message, extra);
}

export function logError(scope: string, message: string, extra?: Record<string, unknown>) {
  // Normaliza Error objects
  if (extra?.error instanceof Error) {
    extra = {
      ...extra,
      error: {
        name: extra.error.name,
        message: extra.error.message,
        stack: extra.error.stack?.split("\n").slice(0, 5).join("\n"),
      },
    };
  }
  emit("error", scope, message, extra);
}
