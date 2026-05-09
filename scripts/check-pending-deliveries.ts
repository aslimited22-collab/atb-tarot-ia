#!/usr/bin/env node
// CLI: lista pedidos pagos sem entrega confirmada nas últimas 72h.
// Uso: npm run check:pending  (executa via tsx)
// Lê .env.local manualmente — não depende de dotenv.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { findPendingDeliveries, summarizeRow } from "../src/lib/check-pending";

function loadDotEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

async function main() {
  loadDotEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local"
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { rows } = await findPendingDeliveries(supabase);

  if (rows.length === 0) {
    console.log("✅ Nenhum pedido pago travado nas últimas 72h.");
    return;
  }

  console.log(
    `\n⚠️  ${rows.length} pedido(s) pago(s) sem entrega confirmada nas últimas 72h:\n`
  );
  console.table(rows.map(summarizeRow));
  console.log(
    `\n💡 Para reenviar manualmente:`,
    `\n   curl -X POST https://atbtartot.com/api/admin/orders/<id-completo>/redeliver \\`,
    `\n        -H "X-Admin-Secret: $ADMIN_SECRET"\n`
  );
}

main().catch((err) => {
  console.error("❌ Erro:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
