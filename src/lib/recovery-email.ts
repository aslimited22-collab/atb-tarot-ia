// Email de resgate (auto follow-up 24h pós-compra) para clientes que
// pagaram mas não acessaram o produto. Disparado pelo cron `/api/cron/follow-up`.
//
// Existem 3 templates baseados no produto comprado:
//   - "pergunta" → pergunta1/3/7 (link pra /obrigado-pergunta)
//   - "limpeza"  → limpeza/limpeza_v2 (link pra /obrigado-limpeza)
//   - "subscription" → basic/premium (link pra /cadastro?email=X)

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type Product = "pergunta" | "limpeza" | "subscription";

export type RecoveryEmailInput = {
  product: Product;
  email: string;
  name: string | null;
  siteUrl: string; // ex: https://atbtartot.com
};

export type RecoveryEmailTemplate = {
  subject: string;
  html: string;
};

function box(content: string): string {
  // Estilo padronizado dos emails (mesmo das webhooks Kiwify)
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    ${content}
  </div>
</body>
</html>`;
}

function emailWarningBlock(email: string): string {
  return `
<div style="background:linear-gradient(135deg,rgba(232,184,75,0.22),rgba(232,184,75,0.08));border:2px solid rgba(232,184,75,0.6);border-radius:14px;padding:20px;margin-top:20px;text-align:left;">
  <p style="color:#e8b84b;font-size:18px;font-weight:800;margin:0 0 8px;line-height:1.3;">
    ⚠️ IMPORTANTE — USE ESTE EMAIL
  </p>
  <p style="color:#fbf8ff;font-size:16px;line-height:1.6;margin:0;font-weight:500;">
    Crie/entre na sua conta com o <strong style="color:#e8b84b;">mesmo email do pagamento:</strong><br/>
    <strong style="color:#f5c860;font-size:18px;">${escapeHtml(email)}</strong><br/>
    <span style="font-size:14px;color:#c4b5fd;">Se usar email diferente, seu acesso não aparece.</span>
  </p>
</div>`;
}

function footer(): string {
  return `
<div style="text-align:center;margin-top:28px;padding:20px;color:#9575cd;font-size:13px;line-height:1.6;font-style:italic;">
  Estamos aqui, minha querida alma. 💛<br/>
  Qualquer dúvida, responda este email.
</div>`;
}

export function buildRecoveryEmail(input: RecoveryEmailInput): RecoveryEmailTemplate {
  const firstName = input.name ? input.name.split(" ")[0] : "querida alma";

  if (input.product === "pergunta") {
    const link = `${input.siteUrl}/obrigado-pergunta?email=${encodeURIComponent(input.email)}`;
    return {
      subject: "✨ Sua pergunta com ATB ainda te espera",
      html: box(`
<div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
  <div style="font-size:64px;margin-bottom:16px;">🔮</div>
  <h1 style="color:#e8b84b;font-size:30px;margin:0 0 12px;line-height:1.15;font-family:'Cormorant Garamond',Georgia,serif;">
    Sua pergunta ainda te espera, ${escapeHtml(firstName)}
  </h1>
  <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
    Notamos que você ainda não fez sua pergunta espiritual com a ATB. Está tudo pronto pra você — leva só 30 segundos.
  </p>
  <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
    ✨ Fazer minha pergunta agora
  </a>
</div>
${emailWarningBlock(input.email)}
${footer()}
`),
    };
  }

  if (input.product === "limpeza") {
    const link = `${input.siteUrl}/obrigado-limpeza?email=${encodeURIComponent(input.email)}`;
    return {
      subject: "🕊️ Sua Limpeza Espiritual está pronta — falta só você acessar",
      html: box(`
<div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
  <div style="font-size:64px;margin-bottom:16px;">🕊️</div>
  <h1 style="color:#e8b84b;font-size:30px;margin:0 0 12px;line-height:1.15;font-family:'Cormorant Garamond',Georgia,serif;">
    Sua Limpeza te espera, ${escapeHtml(firstName)}
  </h1>
  <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
    Sua leitura sagrada foi preparada pelos Santos. Falta só você criar a conta e receber.
  </p>
  <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
    ✨ Acessar minha Limpeza
  </a>
</div>
${emailWarningBlock(input.email)}
${footer()}
`),
    };
  }

  // subscription (basic/premium)
  const link = `${input.siteUrl}/cadastro?email=${encodeURIComponent(input.email)}`;
  return {
    subject: "🔮 Crie sua conta no ATB pra acessar seu plano",
    html: box(`
<div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
  <div style="font-size:64px;margin-bottom:16px;">🔮</div>
  <h1 style="color:#e8b84b;font-size:30px;margin:0 0 12px;line-height:1.15;font-family:'Cormorant Garamond',Georgia,serif;">
    Falta só criar sua conta, ${escapeHtml(firstName)}
  </h1>
  <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
    Sua assinatura ATB está ativa, mas você ainda não criou conta. Aperte o botão dourado abaixo — leva 30 segundos.
  </p>
  <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
    ✨ Criar minha conta agora
  </a>
</div>
${emailWarningBlock(input.email)}
${footer()}
`),
  };
}

/**
 * Mapeia plan da purchase pra categoria de email.
 */
export function productFromPlan(plan: string): Product | null {
  if (plan === "pergunta1" || plan === "pergunta3" || plan === "pergunta7") return "pergunta";
  if (plan === "limpeza" || plan === "limpeza_v2" || plan === "limpeza_v2_intl") return "limpeza";
  if (plan === "basic" || plan === "premium") return "subscription";
  return null;
}
