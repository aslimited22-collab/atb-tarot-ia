// Logger estruturado simples — escreve no console em formato JSON
// para que Vercel/Datadog/qualquer collector consiga indexar por campos.

type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, scope: string, message: string, extra?: Record<string, any>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...(extra || {}),
  };
  // Stringify defensivo (evita circular refs do node fetch Response)
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

export function logInfo(scope: string, message: string, extra?: Record<string, any>) {
  emit("info", scope, message, extra);
}

export function logWarn(scope: string, message: string, extra?: Record<string, any>) {
  emit("warn", scope, message, extra);
}

export function logError(scope: string, message: string, extra?: Record<string, any>) {
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
