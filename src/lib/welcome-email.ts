// E-mail de BOAS-VINDAS pós-compra, localizado nos 6 idiomas (pt/en/es/de/it/ja).
// Mandado pelos webhooks (Kiwify + Stripe) logo após o pagamento. Sempre com o
// magic-link 1-toque como CTA — o cliente entra logado, sem senha, na língua dele.
//
// Estrutura espelha recovery-email.ts: COPY[product][locale] + helpers box/footer.

import type { Locale } from "@/lib/i18n/locales";
import { magicEntryUrl } from "@/lib/magic-entry";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://atbtartot.com").replace(/\/$/, "");

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export type WelcomeProduct = "pergunta" | "limpeza" | "espirito" | "videochamada" | "subscription";

// CTA do botão (magic-link) e a nota "sem senha" — iguais entre produtos.
const CTA: Record<Locale, string> = {
  pt: "✨ Entrar agora com 1 toque",
  en: "✨ Enter now with 1 tap",
  es: "✨ Entrar ahora con 1 toque",
  de: "✨ Jetzt mit 1 Tipp eintreten",
  it: "✨ Entra ora con 1 tocco",
  ja: "✨ ワンタップで今すぐ入る",
};
const NOTE: Record<Locale, string> = {
  pt: "Apertou o botão dourado, entrou. Sem senha, sem formulário.",
  en: "Just tap the gold button — you're in. No password, no form.",
  es: "Toca el botón dorado y entras. Sin contraseña, sin formulario.",
  de: "Tippe auf den goldenen Knopf — du bist drin. Kein Passwort, kein Formular.",
  it: "Tocca il pulsante dorato ed entri. Niente password, niente moduli.",
  ja: "金色のボタンを押すだけで入れます。パスワードも入力も不要です。",
};
const FALLBACK_NOTE: Record<Locale, string> = {
  pt: "Se o botão não funcionar, copie e cole este link no seu navegador:",
  en: "If the button doesn't work, copy and paste this link in your browser:",
  es: "Si el botón no funciona, copia y pega este enlace en tu navegador:",
  de: "Falls der Knopf nicht funktioniert, kopiere diesen Link in deinen Browser:",
  it: "Se il pulsante non funziona, copia questo link nel tuo browser:",
  ja: "ボタンが動かない場合は、このリンクをブラウザに貼り付けてください：",
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

// Por produto × idioma: emoji, assunto, título, corpo.
const COPY: Record<WelcomeProduct, Record<Locale, { emoji: string; subject: string; h1: (n: string) => string; body: string }>> = {
  pergunta: {
    pt: { emoji: "✨", subject: "✨ Sua pergunta com ATB está pronta — entre com 1 toque", h1: (n) => `Sua pergunta te espera, ${n}`, body: "Pagamento confirmado. A ATB já está pronta pra te responder. Você entra direto no chat." },
    en: { emoji: "✨", subject: "✨ Your question with ATB is ready — enter with 1 tap", h1: (n) => `Your question is ready, ${n}`, body: "Payment confirmed. ATB is ready to answer you. You go straight into the chat." },
    es: { emoji: "✨", subject: "✨ Tu pregunta con ATB está lista — entra con 1 toque", h1: (n) => `Tu pregunta te espera, ${n}`, body: "Pago confirmado. ATB ya está lista para responderte. Entras directo al chat." },
    de: { emoji: "✨", subject: "✨ Deine Frage an ATB ist bereit — mit 1 Tipp eintreten", h1: (n) => `Deine Frage wartet, ${n}`, body: "Zahlung bestätigt. ATB ist bereit, dir zu antworten. Du gelangst direkt in den Chat." },
    it: { emoji: "✨", subject: "✨ La tua domanda con ATB è pronta — entra con 1 tocco", h1: (n) => `La tua domanda ti aspetta, ${n}`, body: "Pagamento confermato. ATB è pronta a risponderti. Entri direttamente nella chat." },
    ja: { emoji: "✨", subject: "✨ ATBへの質問の準備ができました — ワンタップで入室", h1: (n) => `${n}さん、質問の準備ができました`, body: "お支払いが確認できました。ATBがお答えする準備をしています。そのままチャットに入れます。" },
  },
  limpeza: {
    pt: { emoji: "🕊️", subject: "🕊️ Sua Limpeza Espiritual está pronta — entre com 1 toque", h1: (n) => `Sua Limpeza te espera, ${n}`, body: "Sua sessão sagrada de limpeza foi preparada. Você entra direto pra começar com a força dos santos." },
    en: { emoji: "🕊️", subject: "🕊️ Your Spiritual Cleansing is ready — enter with 1 tap", h1: (n) => `Your Cleansing is waiting, ${n}`, body: "Your sacred cleansing session has been prepared. You go straight in to begin with the power of the saints." },
    es: { emoji: "🕊️", subject: "🕊️ Tu Limpieza Espiritual está lista — entra con 1 toque", h1: (n) => `Tu Limpieza te espera, ${n}`, body: "Tu sesión sagrada de limpieza ha sido preparada. Entras directo para comenzar con la fuerza de los santos." },
    de: { emoji: "🕊️", subject: "🕊️ Deine spirituelle Reinigung ist bereit — mit 1 Tipp", h1: (n) => `Deine Reinigung wartet, ${n}`, body: "Deine heilige Reinigungssitzung ist vorbereitet. Du gelangst direkt hinein, um mit der Kraft der Heiligen zu beginnen." },
    it: { emoji: "🕊️", subject: "🕊️ La tua Pulizia Spirituale è pronta — entra con 1 tocco", h1: (n) => `La tua Pulizia ti aspetta, ${n}`, body: "La tua sessione sacra di pulizia è stata preparata. Entri direttamente per iniziare con la forza dei santi." },
    ja: { emoji: "🕊️", subject: "🕊️ あなたの霊的クレンジングの準備ができました — ワンタップで", h1: (n) => `${n}さん、クレンジングの準備ができました`, body: "あなたの神聖なクレンジングのセッションを用意しました。そのまま入って、聖人たちの力とともに始められます。" },
  },
  espirito: {
    pt: { emoji: "🕯️", subject: "🕯️ Seu Espírito Mentor te aguarda — entre com 1 toque", h1: (n) => `Seu guia espiritual te chama, ${n}`, body: "Sua sessão espírita está confirmada. Seu guia tem uma mensagem reservada pra você." },
    en: { emoji: "🕯️", subject: "🕯️ Your Spirit Mentor is waiting — enter with 1 tap", h1: (n) => `Your spirit guide is calling you, ${n}`, body: "Your spirit session is confirmed. Your guide has a message reserved for you." },
    es: { emoji: "🕯️", subject: "🕯️ Tu Espíritu Guía te espera — entra con 1 toque", h1: (n) => `Tu guía espiritual te llama, ${n}`, body: "Tu sesión espiritista está confirmada. Tu guía tiene un mensaje reservado para ti." },
    de: { emoji: "🕯️", subject: "🕯️ Dein spiritueller Mentor wartet — mit 1 Tipp eintreten", h1: (n) => `Dein spiritueller Führer ruft dich, ${n}`, body: "Deine spirituelle Sitzung ist bestätigt. Dein Führer hat eine Botschaft für dich reserviert." },
    it: { emoji: "🕯️", subject: "🕯️ Il tuo Mentore Spirituale ti aspetta — entra con 1 tocco", h1: (n) => `La tua guida spirituale ti chiama, ${n}`, body: "La tua sessione spiritica è confermata. La tua guida ha un messaggio riservato per te." },
    ja: { emoji: "🕯️", subject: "🕯️ あなたの霊的メンターが待っています — ワンタップで", h1: (n) => `${n}さん、あなたの霊的ガイドが呼んでいます`, body: "あなたの交霊セッションが確定しました。ガイドがあなたのためにメッセージを用意しています。" },
  },
  videochamada: {
    pt: { emoji: "📞", subject: "📞 Sua videochamada com ATB está confirmada", h1: (n) => `Sua videochamada te aguarda, ${n}`, body: "Pagamento confirmado. Em até 24h a ATB te envia o link do Zoom/Meet com horários. Entre na sua conta pra acompanhar." },
    en: { emoji: "📞", subject: "📞 Your video call with ATB is booked", h1: (n) => `Your video call is booked, ${n}`, body: "Payment confirmed. Within 24h ATB will email your Zoom/Meet link with time options. Sign in to your account to follow along." },
    es: { emoji: "📞", subject: "📞 Tu videollamada con ATB está confirmada", h1: (n) => `Tu videollamada te espera, ${n}`, body: "Pago confirmado. En menos de 24h ATB te enviará el enlace de Zoom/Meet con horarios. Entra a tu cuenta para seguir." },
    de: { emoji: "📞", subject: "📞 Dein Videoanruf mit ATB ist gebucht", h1: (n) => `Dein Videoanruf ist gebucht, ${n}`, body: "Zahlung bestätigt. Innerhalb von 24h sendet ATB dir den Zoom/Meet-Link mit Terminen. Melde dich in deinem Konto an." },
    it: { emoji: "📞", subject: "📞 La tua videochiamata con ATB è confermata", h1: (n) => `La tua videochiamata ti aspetta, ${n}`, body: "Pagamento confermato. Entro 24h ATB ti invierà il link Zoom/Meet con gli orari. Accedi al tuo account per seguire." },
    ja: { emoji: "📞", subject: "📞 ATBとのビデオ通話が予約されました", h1: (n) => `${n}さん、ビデオ通話が予約されました`, body: "お支払いが確認できました。24時間以内にATBがZoom/Meetのリンクと日時候補をお送りします。アカウントにログインしてご確認ください。" },
  },
  subscription: {
    pt: { emoji: "💛", subject: "💛 Sua Consulta Completa com ATB está ativa — entre com 1 toque", h1: (n) => `Sua Consulta Completa te espera, ${n}`, body: "Assinatura ativa. A ATB já está pronta pra conversar com você. Você entra direto no chat." },
    en: { emoji: "💛", subject: "💛 Your Full Consultation with ATB is active — enter with 1 tap", h1: (n) => `Your Full Consultation is ready, ${n}`, body: "Subscription active. ATB is ready to talk with you. You go straight into the chat." },
    es: { emoji: "💛", subject: "💛 Tu Consulta Completa con ATB está activa — entra con 1 toque", h1: (n) => `Tu Consulta Completa te espera, ${n}`, body: "Suscripción activa. ATB ya está lista para hablar contigo. Entras directo al chat." },
    de: { emoji: "💛", subject: "💛 Deine Vollberatung mit ATB ist aktiv — mit 1 Tipp eintreten", h1: (n) => `Deine Vollberatung ist bereit, ${n}`, body: "Abo aktiv. ATB ist bereit, mit dir zu sprechen. Du gelangst direkt in den Chat." },
    it: { emoji: "💛", subject: "💛 La tua Consulenza Completa con ATB è attiva — entra con 1 tocco", h1: (n) => `La tua Consulenza Completa ti aspetta, ${n}`, body: "Abbonamento attivo. ATB è pronta a parlare con te. Entri direttamente nella chat." },
    ja: { emoji: "💛", subject: "💛 ATBのフルコンサルテーションが有効になりました — ワンタップで", h1: (n) => `${n}さん、フルコンサルテーションの準備ができました`, body: "サブスクリプションが有効になりました。ATBがあなたとお話しする準備をしています。そのままチャットに入れます。" },
  },
};

// Cross-sell pós-compra (AOV): oferta SUAVE do próximo produto (estilo secundário,
// não compete com o CTA de acesso). Link com utm pra Kiwify/Stripe atribuírem a venda
// à campanha de upsell. Só nos produtos de maior volume.
const CROSS: Partial<Record<WelcomeProduct, { plan: string; copy: Record<Locale, { h: string; d: string; cta: string }> }>> = {
  pergunta: {
    plan: "limpeza",
    copy: {
      pt: { h: "🕊️ Vá mais fundo", d: "Sentindo um peso que uma pergunta sozinha não tira? A sua Limpeza Espiritual completa com a ATB abre seus caminhos e devolve sua paz.", cta: "Quero minha Limpeza" },
      en: { h: "🕊️ Go deeper", d: "Feeling a weight one question can't lift? A full Spiritual Cleansing with ATB opens your paths and restores your peace.", cta: "I want my Cleansing" },
      es: { h: "🕊️ Ve más profundo", d: "¿Sientes un peso que una sola pregunta no quita? Tu Limpieza Espiritual completa con ATB abre tus caminos y devuelve tu paz.", cta: "Quiero mi Limpieza" },
      de: { h: "🕊️ Geh tiefer", d: "Spürst du eine Last, die eine Frage nicht löst? Eine vollständige spirituelle Reinigung mit ATB öffnet deine Wege und schenkt dir Frieden.", cta: "Ich will meine Reinigung" },
      it: { h: "🕊️ Vai più a fondo", d: "Senti un peso che una sola domanda non toglie? La tua Pulizia Spirituale completa con ATB apre le tue strade e ti ridona la pace.", cta: "Voglio la mia Pulizia" },
      ja: { h: "🕊️ さらに深く", d: "一つの質問では晴れない重さを感じていますか？ATBによる本格的な霊的クレンジングが道を開き、心の平和を取り戻します。", cta: "クレンジングを受けたい" },
    },
  },
  limpeza: {
    plan: "premium",
    copy: {
      pt: { h: "💛 Quer a ATB com você todo dia?", d: "Sua limpeza é o começo. Com a Consulta Completa você conversa com a ATB sobre tudo — amor, família, trabalho — sempre que precisar.", cta: "Conhecer a Consulta Completa" },
      en: { h: "💛 Want ATB with you every day?", d: "Your cleansing is the beginning. With the Full Consultation you talk to ATB about everything — love, family, work — whenever you need.", cta: "See the Full Consultation" },
      es: { h: "💛 ¿Quieres a ATB contigo cada día?", d: "Tu limpieza es el comienzo. Con la Consulta Completa hablas con ATB sobre todo — amor, familia, trabajo — cuando lo necesites.", cta: "Ver la Consulta Completa" },
      de: { h: "💛 Willst du ATB jeden Tag an deiner Seite?", d: "Deine Reinigung ist der Anfang. Mit der Vollberatung sprichst du mit ATB über alles — Liebe, Familie, Arbeit — wann immer du willst.", cta: "Vollberatung entdecken" },
      it: { h: "💛 Vuoi ATB con te ogni giorno?", d: "La tua pulizia è l'inizio. Con la Consulenza Completa parli con ATB di tutto — amore, famiglia, lavoro — quando vuoi.", cta: "Scopri la Consulenza Completa" },
      ja: { h: "💛 毎日ATBをそばに？", d: "クレンジングは始まりです。フルコンサルテーションなら、愛・家族・仕事など何でも、必要なときにATBと話せます。", cta: "フルコンサルテーションを見る" },
    },
  },
};

export type WelcomeEmailInput = {
  product: WelcomeProduct;
  locale: Locale;
  name?: string | null;
  /** Magic-link 1-toque (action_link do Supabase). CTA principal. */
  magicUrl: string;
};

export function buildWelcomeEmail(input: WelcomeEmailInput): { subject: string; html: string } {
  const locale: Locale = (["pt", "en", "es", "de", "it", "ja"] as const).includes(input.locale) ? input.locale : "en";
  const c = COPY[input.product][locale];
  const firstName = input.name ? input.name.split(" ")[0] : DEFAULT_NAME[locale];
  const htmlLang = locale === "pt" ? "pt-BR" : locale;
  // Embrulha o magic-link na página intermediária /entrar (anti-scanner de e-mail).
  const link = escapeHtml(magicEntryUrl(input.magicUrl));

  // Cross-sell suave (AOV) — só quando há oferta de próximo passo pro produto.
  const cross = CROSS[input.product];
  const crossBlock = cross
    ? `<div style="background:rgba(232,184,75,0.06);border:1px solid rgba(232,184,75,0.28);border-radius:14px;padding:20px 22px;margin-top:18px;text-align:center;">
      <p style="color:#e8b84b;font-size:17px;font-weight:700;margin:0 0 8px;">${cross.copy[locale].h}</p>
      <p style="color:#fbf8ff;font-size:15px;line-height:1.6;margin:0 0 16px;font-weight:500;">${cross.copy[locale].d}</p>
      <a href="${escapeHtml(`${SITE}/api/checkout/${cross.plan}?utm_source=email&utm_medium=welcome&utm_campaign=upsell_${input.product}`)}" style="display:inline-block;border:2px solid #e8b84b;color:#e8b84b;font-weight:700;font-size:16px;padding:13px 26px;border-radius:12px;text-decoration:none;">${cross.copy[locale].cta} →</a>
    </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${htmlLang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">${c.emoji}</div>
      <h1 style="color:#e8b84b;font-size:30px;margin:0 0 12px;line-height:1.15;font-family:'Cormorant Garamond',Georgia,serif;">${c.h1(escapeHtml(firstName))}</h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 26px;font-weight:500;">${c.body}</p>
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:21px;padding:21px 38px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">${CTA[locale]}</a>
      <p style="color:#c4b5fd;font-size:14px;margin:18px 0 0;line-height:1.5;">${NOTE[locale]}</p>
    </div>
    <div style="background:rgba(126,232,248,0.08);border:1.5px solid rgba(126,232,248,0.3);border-radius:14px;padding:18px 20px;margin-top:20px;text-align:left;">
      <p style="color:#fbf8ff;font-size:14px;line-height:1.6;margin:0;font-weight:500;">
        ${FALLBACK_NOTE[locale]}<br/>
        <span style="color:#c4b5fd;font-size:12px;word-break:break-all;">${link}</span>
      </p>
    </div>
    ${crossBlock}
    <div style="text-align:center;margin-top:24px;padding:16px;color:#9575cd;font-size:13px;line-height:1.6;font-style:italic;">${FOOTER[locale]}</div>
  </div>
</body></html>`;

  return { subject: c.subject, html };
}
