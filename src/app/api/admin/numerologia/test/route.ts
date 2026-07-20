// POST /api/admin/numerologia/test — gera uma numerologia de TESTE sem compra.
// Prova o fluxo completo (DeepSeek → PDF → Resend com anexo) sem tocar em
// orders/readings. Guard: X-Admin-Secret (molde admin/orders/[id]/redeliver).
//
// Uso:
//   curl -X POST $SITE/api/admin/numerologia/test \
//     -H "X-Admin-Secret: $ADMIN_SECRET" -H "Content-Type: application/json" \
//     -d '{"name":"Maria Teste da Silva","birthDate":"1962-05-14"}'
// Body opcional: "email" (default ADMIN_NOTIFY_EMAIL) e "sendEmail": false
// pra só validar geração+PDF sem enviar nada.

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { generateNumerologiaReading } from "@/lib/numerologia-produto";
import { buildNumerologiaPdf } from "@/lib/numerologia-pdf";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "admin secret not configured" }, { status: 500 });
  }
  if ((req.headers.get("x-admin-secret") || "") !== adminSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { name?: string; birthDate?: string; email?: string; sendEmail?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const birthDate = (body.birthDate || "").trim();
  if (name.length < 5 || !DATE_RE.test(birthDate)) {
    return NextResponse.json({ error: "name (completo) e birthDate (YYYY-MM-DD) obrigatórios" }, { status: 400 });
  }

  try {
    const t0 = Date.now();
    const { json, text } = await generateNumerologiaReading({ name, birthDate });
    const genMs = Date.now() - t0;

    const pdfBytes = await buildNumerologiaPdf(json, name);

    let emailStatus: string = "skipped";
    if (body.sendEmail !== false) {
      const to = (body.email || process.env.ADMIN_NOTIFY_EMAIL || "aslimited22@gmail.com").trim();
      if (!process.env.RESEND_API_KEY) {
        emailStatus = "skipped (RESEND_API_KEY not set)";
      } else {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const result = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "ATB <atb@atbtartot.com>",
          to,
          subject: `[TESTE] Numerologia — ${name}`,
          html: `<p>Teste do produto Numerologia (sem compra).</p><pre style="white-space:pre-wrap;font-family:Georgia,serif;">${text.slice(0, 1500)}</pre>`,
          attachments: [{ filename: "numerologia-teste.pdf", content: Buffer.from(pdfBytes) }],
        });
        emailStatus = result?.error ? `failed: ${result.error.message}` : `sent to ${to}`;
      }
    }

    logInfo("numerologia.test", "test generation ok", { genMs, pdfBytes: pdfBytes.length, emailStatus });
    return NextResponse.json({
      ok: true,
      generationMs: genMs,
      pdfBytes: pdfBytes.length,
      email: emailStatus,
      numeros: json.numeros.map((n) => `${n.nome}: ${n.numero}`),
      numeros_da_sorte: json.numeros_da_sorte,
      title: json.title,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError("numerologia.test", "test failed", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
