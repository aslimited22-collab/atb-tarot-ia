#!/usr/bin/env node
// Aplica uma migration SQL no Supabase production via Management API.
// Uso:   SUPABASE_PAT=sbp_xxx node scripts/apply-migration.mjs <arquivo.sql> [project-ref]
// Ex.:   SUPABASE_PAT=$PAT node scripts/apply-migration.mjs supabase/migrations/0010_users_cascade_fk.sql doabpdjmbfqrrisvmblo
//
// O Personal Access Token deve vir de https://supabase.com/dashboard/account/tokens
// e nunca ser commitado.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , filePath, projectRefArg] = process.argv;
const pat = process.env.SUPABASE_PAT;
const projectRef = projectRefArg || process.env.SUPABASE_PROJECT_REF;

if (!pat) {
  console.error("❌ SUPABASE_PAT não definido");
  process.exit(1);
}
if (!filePath) {
  console.error("❌ Caminho do .sql obrigatório (1º arg)");
  process.exit(1);
}
if (!projectRef) {
  console.error("❌ projectRef obrigatório (2º arg ou SUPABASE_PROJECT_REF)");
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), filePath), "utf8");

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${pat}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`❌ HTTP ${res.status}`);
  console.error(text.slice(0, 1000));
  process.exit(1);
}

console.log(`✅ ${filePath} aplicada (HTTP ${res.status})`);
const trimmed = text.slice(0, 400);
if (trimmed && trimmed !== "null" && trimmed !== "[]") {
  console.log("   resposta:", trimmed);
}
