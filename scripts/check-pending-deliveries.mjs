#!/usr/bin/env node
// Lista pedidos pagos da Limpeza V2 SEM entrega confirmada nas últimas 72h.
// Uso: node scripts/check-pending-deliveries.mjs
// Lê .env.local automaticamente (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// ── Carrega .env.local manualmente (sem dotenv) ───────────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const sinceIso = new Date(Date.now() - 72 * 3600 * 1000).toISOString();

const { data, error } = await supabase
  .from("orders")
  .select(
    "id,email,name,phone,created_at,delivery_status,delivery_attempts,delivery_last_error,status,product_type"
  )
  .eq("status", "paid")
  .eq("product_type", "limpeza_espiritual")
  .gte("created_at", sinceIso)
  .or("delivery_status.is.null,delivery_status.in.(pending,failed,manual_review)")
  .order("created_at", { ascending: false });

if (error) {
  console.error("❌ Erro na query:", error.message);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log("✅ Nenhum pedido pago travado nas últimas 72h.");
  process.exit(0);
}

console.log(`\n⚠️  ${data.length} pedido(s) pago(s) sem entrega confirmada nas últimas 72h:\n`);
console.table(
  data.map((r) => ({
    id: String(r.id).slice(0, 8) + "…",
    email: r.email,
    name: (r.name || "").slice(0, 20),
    phone: r.phone || "—",
    created: String(r.created_at || "").slice(0, 16).replace("T", " "),
    delivery_status: r.delivery_status || "null",
    attempts: r.delivery_attempts ?? 0,
    last_error: (r.delivery_last_error || "").slice(0, 60),
  }))
);

console.log(
  `\n💡 Para reenviar manualmente:`,
  `\n   curl -X POST https://atbtartot.com/api/admin/orders/<id-completo>/redeliver \\`,
  `\n        -H "X-Admin-Secret: $ADMIN_SECRET"\n`
);
