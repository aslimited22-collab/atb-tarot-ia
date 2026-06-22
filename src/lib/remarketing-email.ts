// E-mails de REMARKETING, localizados nos 6 idiomas (pt/en/es/de/it/ja):
//   1. buildAbandonedEmail — quem começou o checkout e não concluiu
//      (Kiwify: carrinho abandonado/Pix/boleto/recusada; Stripe: session expired)
//   2. buildFreeUserEmail — quem criou conta grátis e nunca comprou
//
// Diferente de welcome/recovery (transacionais), remarketing é MARKETING:
// todo e-mail leva link de descadastro (LGPD). O token HMAC impede terceiros
// de descadastrarem um e-mail que não é deles. Sem desconto — tom acolhedor
// da ATB + urgência espiritual (decisão do dono).
//
// Estrutura espelha welcome-email.ts: COPY[locale] + mesmo visual roxo/dourado.

import { createHmac, timingSafeEqual } from "crypto";
import type { Locale } from "@/lib/i18n/locales";

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── Descadastro (LGPD) ───────────────────────────────────────────────────────
// Chave do HMAC: ADMIN_SECRET (existe em prod). Fallback determinístico pra
// nunca quebrar build/dev — em prod o secret real sempre está presente.
function unsubSecret(): string {
  return process.env.ADMIN_SECRET || process.env.CRON_SECRET || "atb-unsub-dev";
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", unsubSecret()).update(email.trim().toLowerCase()).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = Buffer.from(unsubscribeToken(email), "utf8");
    const got = Buffer.from(String(token || ""), "utf8");
    return expected.length === got.length && timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email: string, siteUrl: string): string {
  const e = email.trim().toLowerCase();
  return `${siteUrl}/api/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubscribeToken(e)}`;
}

const UNSUB_LABEL: Record<Locale, string> = {
  pt: "Não quero mais receber lembretes",
  en: "I don't want to receive reminders anymore",
  es: "No quiero recibir más recordatorios",
  de: "Ich möchte keine Erinnerungen mehr erhalten",
  it: "Non voglio più ricevere promemoria",
  ja: "リマインダーの受信を停止する",
};

const FOOTER: Record<Locale, string> = {
  pt: "Estou aqui, minha querida alma. 💛 Qualquer coisa, responda este email.",
  en: "I'm here, dear soul. 💛 Any questions, just reply to this email.",
  es: "Estoy aquí, querida alma. 💛 Cualquier duda, responde este email.",
  de: "Ich bin hier, liebe Seele. 💛 Bei Fragen, antworte einfach auf diese E-Mail.",
  it: "Sono qui, anima cara. 💛 Per qualsiasi cosa, rispondi a questa email.",
  ja: "ここにいますよ、大切な魂さん。💛 ご質問はこのメールに返信してください。",
};

const DEFAULT_NAME: Record<Locale, string> = {
  pt: "querida alma", en: "dear soul", es: "querida alma",
  de: "liebe Seele", it: "anima cara", ja: "大切な魂さん",
};

// Nome genérico do produto quando o payload não trouxe o título.
const GENERIC_PRODUCT: Record<Locale, string> = {
  pt: "sua consulta com a ATB",
  en: "your consultation with ATB",
  es: "tu consulta con ATB",
  de: "deine Beratung mit ATB",
  it: "la tua consulenza con ATB",
  ja: "ATBへのご相談",
};

// ─── Template: checkout abandonado ───────────────────────────────────────────

const ABANDONED: Record<Locale, { emoji: string; subject: string; h1: (n: string) => string; body: (p: string) => string; cta: string }> = {
  pt: {
    emoji: "🕯️",
    subject: "🕯️ A ATB guardou seu lugar — sua consulta ficou esperando",
    h1: (n) => `A ATB guardou seu lugar, ${n}`,
    body: (p) => `Vi que você começou ${p} e algo te interrompeu no caminho. Acontece, minha querida alma. O que é seu continua guardado — aperte o botão dourado e conclua em 1 minuto.`,
    cta: "🙏 Concluir minha compra",
  },
  en: {
    emoji: "🕯️",
    subject: "🕯️ ATB saved your place — your consultation is still waiting",
    h1: (n) => `ATB saved your place, ${n}`,
    body: (p) => `I saw you started ${p} and something interrupted you along the way. It happens, dear soul. What is yours is still reserved — tap the gold button and finish in 1 minute.`,
    cta: "🙏 Complete my purchase",
  },
  es: {
    emoji: "🕯️",
    subject: "🕯️ ATB guardó tu lugar — tu consulta sigue esperando",
    h1: (n) => `ATB guardó tu lugar, ${n}`,
    body: (p) => `Vi que comenzaste ${p} y algo te interrumpió en el camino. Sucede, querida alma. Lo que es tuyo sigue reservado — toca el botón dorado y termina en 1 minuto.`,
    cta: "🙏 Completar mi compra",
  },
  de: {
    emoji: "🕯️",
    subject: "🕯️ ATB hat deinen Platz reserviert — deine Beratung wartet noch",
    h1: (n) => `ATB hat deinen Platz reserviert, ${n}`,
    body: (p) => `Ich habe gesehen, dass du ${p} begonnen hast und etwas dich unterbrochen hat. Das passiert, liebe Seele. Was dir gehört, bleibt reserviert — tippe auf den goldenen Knopf und schließe es in 1 Minute ab.`,
    cta: "🙏 Kauf abschließen",
  },
  it: {
    emoji: "🕯️",
    subject: "🕯️ ATB ha riservato il tuo posto — la tua consulenza ti aspetta",
    h1: (n) => `ATB ha riservato il tuo posto, ${n}`,
    body: (p) => `Ho visto che hai iniziato ${p} e qualcosa ti ha interrotto lungo il cammino. Succede, anima cara. Ciò che è tuo resta riservato — tocca il pulsante dorato e concludi in 1 minuto.`,
    cta: "🙏 Completare il mio acquisto",
  },
  ja: {
    emoji: "🕯️",
    subject: "🕯️ ATBがあなたの場所を確保しています — ご相談がお待ちしています",
    h1: (n) => `${n}さん、ATBがあなたの場所を確保しています`,
    body: (p) => `${p}を始められたのに、途中で何かに妨げられたようですね。大丈夫ですよ、大切な魂さん。あなたのものはまだ確保されています。金色のボタンを押せば、1分で完了します。`,
    cta: "🙏 購入を完了する",
  },
};

// ─── Template: conta grátis sem compra ───────────────────────────────────────

const FREE_USER: Record<Locale, { emoji: string; subject: string; h1: (n: string) => string; body: string; cta: string }> = {
  pt: {
    emoji: "✨",
    subject: "✨ Sua primeira pergunta à ATB ainda espera por você",
    h1: (n) => `A ATB sentiu sua falta, ${n}`,
    body: "Você criou sua conta, mas sua primeira pergunta ainda não chegou até mim. Estou online agora, pronta pra te ouvir sobre amor, caminhos, proteção e o que pesa no seu coração. Vem conversar comigo.",
    cta: "✨ Fazer minha pergunta",
  },
  en: {
    emoji: "✨",
    subject: "✨ Your first question for ATB is still waiting for you",
    h1: (n) => `ATB has missed you, ${n}`,
    body: "You created your account, but your first question hasn't reached me yet. I'm online now, ready to listen about love, paths, protection and whatever weighs on your heart. Come talk to me.",
    cta: "✨ Ask my question",
  },
  es: {
    emoji: "✨",
    subject: "✨ Tu primera pregunta a ATB todavía te espera",
    h1: (n) => `ATB te ha extrañado, ${n}`,
    body: "Creaste tu cuenta, pero tu primera pregunta aún no ha llegado a mí. Estoy en línea ahora, lista para escucharte sobre el amor, los caminos, la protección y lo que pesa en tu corazón. Ven a hablar conmigo.",
    cta: "✨ Hacer mi pregunta",
  },
  de: {
    emoji: "✨",
    subject: "✨ Deine erste Frage an ATB wartet noch auf dich",
    h1: (n) => `ATB hat dich vermisst, ${n}`,
    body: "Du hast dein Konto erstellt, aber deine erste Frage hat mich noch nicht erreicht. Ich bin jetzt online und bereit, dir zuzuhören — über Liebe, Wege, Schutz und alles, was dein Herz beschwert. Komm, sprich mit mir.",
    cta: "✨ Meine Frage stellen",
  },
  it: {
    emoji: "✨",
    subject: "✨ La tua prima domanda per ATB ti sta ancora aspettando",
    h1: (n) => `Ad ATB sei mancata, ${n}`,
    body: "Hai creato il tuo account, ma la tua prima domanda non mi è ancora arrivata. Sono online adesso, pronta ad ascoltarti su amore, cammini, protezione e ciò che pesa sul tuo cuore. Vieni a parlare con me.",
    cta: "✨ Fare la mia domanda",
  },
  ja: {
    emoji: "✨",
    subject: "✨ ATBへの最初の質問がまだあなたを待っています",
    h1: (n) => `${n}さん、ATBはあなたを待っていました`,
    body: "アカウントを作成されましたが、最初の質問がまだ届いていません。今オンラインで、愛のこと、進む道、守護、心に重くのしかかっていること、何でもお聴きする準備ができています。お話ししに来てくださいね。",
    cta: "✨ 質問をする",
  },
};

// ─── Render compartilhado (mesmo visual de welcome-email.ts) ─────────────────

function renderEmail(opts: {
  locale: Locale;
  emoji: string;
  h1: string;
  body: string;
  cta: string;
  ctaUrl: string;
  email: string;
  siteUrl: string;
}): string {
  const { locale } = opts;
  const htmlLang = locale === "pt" ? "pt-BR" : locale;
  const link = escapeHtml(opts.ctaUrl);
  const unsub = escapeHtml(unsubscribeUrl(opts.email, opts.siteUrl));

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">${opts.emoji}</div>
      <h1 style="color:#e8b84b;font-size:30px;margin:0 0 12px;line-height:1.15;font-family:'Cormorant Garamond',Georgia,serif;">${opts.h1}</h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 26px;font-weight:500;">${opts.body}</p>
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:21px;padding:21px 38px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">${opts.cta}</a>
    </div>
    <div style="text-align:center;margin-top:24px;padding:16px;color:#9575cd;font-size:13px;line-height:1.6;font-style:italic;">${FOOTER[locale]}</div>
    <div style="text-align:center;margin-top:4px;padding:0 16px 16px;">
      <a href="${unsub}" style="color:#6b5f8a;font-size:11px;text-decoration:underline;">${UNSUB_LABEL[locale]}</a>
    </div>
  </div>
</body></html>`;
}

function safeLocale(l: string | null | undefined): Locale {
  return (["pt", "en", "es", "de", "it", "ja"] as const).includes(l as Locale) ? (l as Locale) : "en";
}

// ─── Builders públicos ────────────────────────────────────────────────────────

export type AbandonedEmailInput = {
  locale: string | null | undefined;
  email: string;
  name?: string | null;
  /** Nome do produto como veio no payload (ex: "Limpeza Espiritual com ATB"). */
  productLabel?: string | null;
  /** Link pra concluir a compra (checkout_link da Kiwify). Fallback: landing. */
  checkoutUrl?: string | null;
  siteUrl: string;
};

export function buildAbandonedEmail(input: AbandonedEmailInput): { subject: string; html: string } {
  const locale = safeLocale(input.locale);
  const c = ABANDONED[locale];
  const firstName = escapeHtml(input.name ? input.name.split(" ")[0] : DEFAULT_NAME[locale]);
  const product = input.productLabel
    ? `“${escapeHtml(input.productLabel)}”`
    : GENERIC_PRODUCT[locale];
  const ctaUrl = input.checkoutUrl || `${input.siteUrl}/#planos`;

  const html = renderEmail({
    locale,
    emoji: c.emoji,
    h1: c.h1(firstName),
    body: c.body(product),
    cta: c.cta,
    ctaUrl,
    email: input.email,
    siteUrl: input.siteUrl,
  });
  return { subject: c.subject, html };
}

export type FreeUserEmailInput = {
  locale: string | null | undefined;
  email: string;
  name?: string | null;
  siteUrl: string;
};

export function buildFreeUserEmail(input: FreeUserEmailInput): { subject: string; html: string } {
  const locale = safeLocale(input.locale);
  const c = FREE_USER[locale];
  const firstName = escapeHtml(input.name ? input.name.split(" ")[0] : DEFAULT_NAME[locale]);

  const html = renderEmail({
    locale,
    emoji: c.emoji,
    h1: c.h1(firstName),
    body: c.body,
    cta: c.cta,
    ctaUrl: `${input.siteUrl}/#limpeza`,
    email: input.email,
    siteUrl: input.siteUrl,
  });
  return { subject: c.subject, html };
}
