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

type Product = "pergunta" | "limpeza" | "subscription" | "espirito" | "videochamada";
type Locale = "pt" | "en" | "es";

export type RecoveryEmailInput = {
  product: Product;
  email: string;
  name: string | null;
  siteUrl: string; // ex: https://atbtartot.com
  /** Default "pt". Suporta "en" e "es" pros clientes intl. */
  locale?: Locale;
  /**
   * Magic-link 1-clique (Supabase OTP `action_link`). Quando presente, vira
   * o CTA principal — 60+ entra sem digitar senha. Sem ele, fallback pro
   * link estático que abre /obrigado-pergunta com email pre-preenchido.
   */
  magicLink?: string;
};

export type RecoveryEmailTemplate = {
  subject: string;
  html: string;
};

function box(content: string, lang: Locale = "pt"): string {
  // Estilo padronizado dos emails (mesmo das webhooks Kiwify)
  const htmlLang = lang === "pt" ? "pt-BR" : lang;
  return `
<!DOCTYPE html>
<html lang="${htmlLang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    ${content}
  </div>
</body>
</html>`;
}

function emailWarningBlock(email: string, locale: Locale = "pt"): string {
  const copy = {
    pt: {
      title: "⚠️ IMPORTANTE — USE ESTE EMAIL",
      body: "Crie/entre na sua conta com o",
      strong: "mesmo email do pagamento:",
      note: "Se usar email diferente, seu acesso não aparece.",
    },
    en: {
      title: "⚠️ IMPORTANT — USE THIS EMAIL",
      body: "Create or sign in with the",
      strong: "same email you used at checkout:",
      note: "Using a different email means your access won't appear.",
    },
    es: {
      title: "⚠️ IMPORTANTE — USA ESTE EMAIL",
      body: "Crea o entra en tu cuenta con el",
      strong: "mismo email del pago:",
      note: "Si usas otro email, tu acceso no aparece.",
    },
  }[locale];
  return `
<div style="background:linear-gradient(135deg,rgba(232,184,75,0.22),rgba(232,184,75,0.08));border:2px solid rgba(232,184,75,0.6);border-radius:14px;padding:20px;margin-top:20px;text-align:left;">
  <p style="color:#e8b84b;font-size:18px;font-weight:800;margin:0 0 8px;line-height:1.3;">
    ${copy.title}
  </p>
  <p style="color:#fbf8ff;font-size:16px;line-height:1.6;margin:0;font-weight:500;">
    ${copy.body} <strong style="color:#e8b84b;">${copy.strong}</strong><br/>
    <strong style="color:#f5c860;font-size:18px;">${escapeHtml(email)}</strong><br/>
    <span style="font-size:14px;color:#c4b5fd;">${copy.note}</span>
  </p>
</div>`;
}

function footer(locale: Locale = "pt"): string {
  const copy = {
    pt: { line1: "Estamos aqui, minha querida alma. 💛", line2: "Qualquer dúvida, responda este email." },
    en: { line1: "We're here, dear soul. 💛", line2: "Any questions, just reply to this email." },
    es: { line1: "Estamos aquí, querida alma. 💛", line2: "Cualquier duda, responde este email." },
  }[locale];
  return `
<div style="text-align:center;margin-top:28px;padding:20px;color:#9575cd;font-size:13px;line-height:1.6;font-style:italic;">
  ${copy.line1}<br/>
  ${copy.line2}
</div>`;
}

/** Default fallback name por locale */
function defaultName(locale: Locale): string {
  return { pt: "querida alma", en: "dear soul", es: "querida alma" }[locale];
}

// Copy table: product × locale. Adicionar nova locale = adicionar entradas aqui.
// PT é o source-of-truth; EN/ES traduzidas pra clientes intl.
const TEMPLATES: Record<Product, Record<Locale, {
  subject: string;
  h1: (name: string) => string;
  body: string;
  cta: string;
  emoji: string;
  path: string;
}>> = {
  pergunta: {
    pt: {
      subject: "✨ Sua pergunta com ATB ainda te espera",
      h1: (n) => `Sua pergunta ainda te espera, ${n}`,
      body: "Notamos que você ainda não fez sua pergunta espiritual com a ATB. Está tudo pronto pra você — leva só 30 segundos.",
      cta: "✨ Fazer minha pergunta agora",
      emoji: "🔮",
      path: "/obrigado-pergunta",
    },
    en: {
      subject: "✨ Your question with ATB is still waiting",
      h1: (n) => `Your question is waiting, ${n}`,
      body: "We noticed you haven't asked your spiritual question yet. Everything's ready — it only takes 30 seconds.",
      cta: "✨ Ask my question now",
      emoji: "🔮",
      path: "/obrigado-pergunta",
    },
    es: {
      subject: "✨ Tu pregunta con ATB sigue esperándote",
      h1: (n) => `Tu pregunta te espera, ${n}`,
      body: "Notamos que aún no has hecho tu pregunta espiritual con ATB. Todo está listo — solo toma 30 segundos.",
      cta: "✨ Hacer mi pregunta ahora",
      emoji: "🔮",
      path: "/obrigado-pergunta",
    },
  },
  limpeza: {
    pt: {
      subject: "🕊️ Sua Limpeza Espiritual está pronta — falta só você acessar",
      h1: (n) => `Sua Limpeza te espera, ${n}`,
      body: "Sua leitura sagrada foi preparada pelos Santos. Falta só você criar a conta e receber.",
      cta: "✨ Acessar minha Limpeza",
      emoji: "🕊️",
      path: "/obrigado-limpeza",
    },
    en: {
      subject: "🕊️ Your Spiritual Cleansing is ready — just sign in to receive",
      h1: (n) => `Your Cleansing is waiting, ${n}`,
      body: "Your sacred reading has been prepared. Just create your account and receive it.",
      cta: "✨ Access my Cleansing",
      emoji: "🕊️",
      path: "/obrigado-limpeza",
    },
    es: {
      subject: "🕊️ Tu Limpieza Espiritual está lista — entra para recibirla",
      h1: (n) => `Tu Limpieza te espera, ${n}`,
      body: "Tu lectura sagrada ha sido preparada. Solo falta crear tu cuenta y recibirla.",
      cta: "✨ Acceder a mi Limpieza",
      emoji: "🕊️",
      path: "/obrigado-limpeza",
    },
  },
  espirito: {
    pt: {
      subject: "🕯️ Seu Espírito Mentor ainda te espera",
      h1: (n) => `Seu guia espiritual te chama, ${n}`,
      body: "Sua sessão espírita está confirmada mas você ainda não acessou. Seu guia tem uma mensagem reservada pra você.",
      cta: "✨ Falar com meu Espírito Mentor",
      emoji: "🕯️",
      path: "/obrigado-espirito",
    },
    en: {
      subject: "🕯️ Your Spirit Mentor is still waiting",
      h1: (n) => `Your spirit guide is calling you, ${n}`,
      body: "Your spirit session is confirmed but you haven't accessed it yet. Your guide has a message reserved for you.",
      cta: "✨ Talk to my Spirit Mentor",
      emoji: "🕯️",
      path: "/obrigado-espirito",
    },
    es: {
      subject: "🕯️ Tu Espíritu Guía sigue esperándote",
      h1: (n) => `Tu guía espiritual te llama, ${n}`,
      body: "Tu sesión espiritista está confirmada pero aún no has accedido. Tu guía tiene un mensaje reservado para ti.",
      cta: "✨ Hablar con mi Espíritu Guía",
      emoji: "🕯️",
      path: "/obrigado-espirito",
    },
  },
  videochamada: {
    pt: {
      subject: "📹 Sua videochamada com ATB ainda está pendente",
      h1: (n) => `Sua videochamada te aguarda, ${n}`,
      body: "Sua chamada de vídeo com ATB está confirmada. Aperte abaixo pra agendar o horário.",
      cta: "📅 Agendar minha videochamada",
      emoji: "📹",
      path: "/obrigado-videochamada",
    },
    en: {
      subject: "📹 Your video call with ATB is still pending",
      h1: (n) => `Your video call is waiting, ${n}`,
      body: "Your video call with ATB is confirmed. Click below to schedule your time.",
      cta: "📅 Schedule my video call",
      emoji: "📹",
      path: "/obrigado-videochamada",
    },
    es: {
      subject: "📹 Tu videollamada con ATB sigue pendiente",
      h1: (n) => `Tu videollamada te espera, ${n}`,
      body: "Tu videollamada con ATB está confirmada. Haz clic abajo para agendar tu horario.",
      cta: "📅 Agendar mi videollamada",
      emoji: "📹",
      path: "/obrigado-videochamada",
    },
  },
  subscription: {
    pt: {
      subject: "💛 Sua Consulta Completa com ATB te espera",
      h1: (n) => `Sua Consulta Completa te espera, ${n}`,
      body: "Sua Consulta Completa com ATB está ativa, mas você ainda não criou conta pra começar a conversar. Aperte o botão dourado abaixo — leva 30 segundos.",
      cta: "✨ Quero conversar com ATB",
      emoji: "💛",
      path: "/cadastro",
    },
    en: {
      subject: "💛 Your Full Consultation with ATB is waiting",
      h1: (n) => `Your Full Consultation is waiting, ${n}`,
      body: "Your Full Consultation with ATB is active, but you haven't created an account yet to start talking. Click the gold button below — takes 30 seconds.",
      cta: "✨ I want to talk to ATB",
      emoji: "💛",
      path: "/cadastro",
    },
    es: {
      subject: "💛 Tu Consulta Completa con ATB te espera",
      h1: (n) => `Tu Consulta Completa te espera, ${n}`,
      body: "Tu Consulta Completa con ATB está activa, pero aún no creaste cuenta para empezar a hablar. Haz clic en el botón dorado abajo — toma 30 segundos.",
      cta: "✨ Quiero hablar con ATB",
      emoji: "💛",
      path: "/cadastro",
    },
  },
};

export function buildRecoveryEmail(input: RecoveryEmailInput): RecoveryEmailTemplate {
  const locale: Locale = input.locale === "en" || input.locale === "es" ? input.locale : "pt";
  const firstName = input.name ? input.name.split(" ")[0] : defaultName(locale);
  const tmpl = TEMPLATES[input.product][locale];
  // Magic-link entra como CTA primario (1-clique, sem senha). Fallback: link estatico.
  const link = input.magicLink
    ?? `${input.siteUrl}${tmpl.path}?email=${encodeURIComponent(input.email)}`;
  const hasMagicLink = !!input.magicLink;

  // Copy "Entrar com 1 toque" quando temos magic-link, senao usa o cta padrao do template
  const ctaLabel = hasMagicLink
    ? { pt: "✨ Entrar agora com 1 toque", en: "✨ Enter now with 1 tap", es: "✨ Entrar ahora con 1 toque" }[locale]
    : tmpl.cta;
  // Subhead que orienta o cliente 60+ que nao precisa digitar nada
  const noPasswordNote = hasMagicLink
    ? { pt: "Apertou o botão dourado, entrou direto. Sem senha, sem formulário.", en: "Just tap the gold button — straight in. No password, no form.", es: "Toca el botón dorado y entras. Sin contraseña, sin formulario." }[locale]
    : "";

  return {
    subject: tmpl.subject,
    html: box(`
<div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
  <div style="font-size:64px;margin-bottom:16px;">${tmpl.emoji}</div>
  <h1 style="color:#e8b84b;font-size:30px;margin:0 0 12px;line-height:1.15;font-family:'Cormorant Garamond',Georgia,serif;">
    ${tmpl.h1(escapeHtml(firstName))}
  </h1>
  <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
    ${tmpl.body}
  </p>
  <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
    ${ctaLabel}
  </a>
  ${noPasswordNote ? `<p style="color:#c4b5fd;font-size:14px;margin:18px 0 0;line-height:1.5;">${noPasswordNote}</p>` : ""}
</div>
${hasMagicLink ? "" : emailWarningBlock(input.email, locale)}
${footer(locale)}
`, locale),
  };
}

/**
 * Mapeia plan da purchase pra categoria de email.
 */
export function productFromPlan(plan: string): Product | null {
  if (plan === "pergunta1" || plan === "pergunta3" || plan === "pergunta7") return "pergunta";
  if (plan === "limpeza" || plan === "limpeza_v2" || plan === "limpeza_v2_intl") return "limpeza";
  if (plan === "basic" || plan === "premium") return "subscription";
  if (plan === "espirito") return "espirito";
  if (plan === "video_call" || plan === "videochamada") return "videochamada";
  return null;
}
