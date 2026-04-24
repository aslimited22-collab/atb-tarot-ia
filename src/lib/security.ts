// Domínios de email descartáveis/temporários bloqueados
const BLOCKED_DOMAINS = new Set([
  "10minutemail.com","10minutemail.net","10minutemail.org",
  "guerrillamail.com","guerrillamail.net","guerrillamail.org","guerrillamail.info",
  "mailnator.com","sharklasers.com","guerrillamailblock.com","grr.la",
  "guerrillamail.de","spam4.me","yopmail.com","yopmail.fr","cool.fr.nf",
  "jetable.fr.nf","nospam.ze.tc","nomail.xl.cx","mega.zik.dj","speed.1s.fr",
  "courriel.fr.nf","moncourrier.fr.nf","monemail.fr.nf","monmail.fr.nf",
  "tempmail.com","temp-mail.org","temp-mail.io","dispostable.com",
  "mailnull.com","mailnull.net","spamgourmet.com","spamgourmet.net",
  "trashmail.com","trashmail.me","trashmail.at","trashmail.io","trashmail.net",
  "throwam.com","throwam.net","mailinator.com","maildrop.cc","discard.email",
  "fakeinbox.com","mailnesia.com","mailnull.com","spam.la","spamfree24.org",
  "spamhereplease.com","spammotel.com","spamspot.com","mailcatch.com",
  "spamgap.com","spamherelots.com","deadaddress.com","despam.it",
  "e4ward.com","emailias.com","emailsensei.com","emailtemporario.com.br",
  "fakedemail.com","filzmail.com","gishpuppy.com","haltospam.com",
  "incognitomail.com","jetable.com","jetable.net","jetable.org",
  "kasmail.com","klassmaster.com","kurzepost.de","lhsdv.com",
  "lifebyfood.com","mailexpire.com","mailme.lv","mailnew.com",
  "mailnull.com","mailsiphon.com","mailslapping.com","mailzilla.com",
  "meltmail.com","mierdamail.com","migumail.com","mintemail.com",
  "mt2009.com","myspamless.com","netmails.com","nomail.pw","nospamfor.us",
  "nowmymail.com","objectmail.com","odaymail.com","ownmail.net",
  "pecinan.com","pecinan.net","pecinan.org","pookmail.com","privacy.net",
  "proxymail.eu","quickinbox.com","rcpt.at","rklips.com","rmqkr.net",
  "s0ny.net","safe-mail.net","shortmail.net","skeefmail.com","slopsbox.com",
  "sofimail.com","sogetthis.com","soodonims.com","spam.su","spamavert.com",
  "spambob.com","spambog.com","spambog.de","spambog.ru","spambox.us",
  "spamcannon.com","spamcannon.net","spamcon.org","spamcorpse.com",
  "spamday.com","spamex.com","spamfree.eu","spamfree24.de","spamfree24.eu",
  "spamgob.com","tempr.email","throwam.com","tinoza.org","trbvm.com",
  "trillianpro.com","turual.com","tyldd.com","uggsrock.com","uroid.com",
  "veryrealemail.com","viditag.com","vipmail.name","webm4il.info",
  "wetrainbayarea.com","wr9r.net","xagloo.com","xemaps.com","xents.com",
  "xmaily.com","xoxy.net","xyz.am","yep.it","yogamaven.com","yuurok.com",
  "za.com","zehnminutenmail.de","zippymail.info","zostmail.com",
]);

// Proveedores de email legítimos e comuns no Brasil — whitelist
const ALLOWED_DOMAINS = new Set([
  "gmail.com","googlemail.com",
  "hotmail.com","hotmail.com.br","outlook.com","outlook.com.br","live.com","live.com.br",
  "yahoo.com","yahoo.com.br",
  "icloud.com","me.com","mac.com",
  "uol.com.br","bol.com.br","terra.com.br","ig.com.br","globo.com","r7.com",
  "oi.com.br","tim.com.br","claro.com.br","vivo.com.br",
  "protonmail.com","pm.me","tutanota.com",
  "msn.com","aol.com",
]);

export function validateEmail(email: string): { ok: boolean; reason?: string } {
  const lower = email.toLowerCase().trim();

  // Formato básico
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(lower)) return { ok: false, reason: "Formato de email inválido." };

  const domain = lower.split("@")[1];

  // Bloqueia domínios descartáveis conhecidos
  if (BLOCKED_DOMAINS.has(domain)) {
    return { ok: false, reason: "Use um email real para criar sua conta." };
  }

  // Só permite domínios conhecidos — rejeita emails corporativos/universitários desconhecidos
  // para o MVP focado em consumidor final brasileiro
  if (!ALLOWED_DOMAINS.has(domain)) {
    return { ok: false, reason: "Por favor use um email Gmail, Hotmail, Yahoo, iCloud ou similar." };
  }

  return { ok: true };
}

// Rate limiter em memória (Edge-safe, reinicia entre deployments — OK para MVP)
const ipMap = new Map<string, { count: number; reset: number }>();

export function rateLimit(ip: string, limit: number, windowMs: number): { ok: boolean; retryAfter?: number } {
  const now = Date.now();

  // Limpeza preventiva: evita map crescer sem limite em instâncias long-lived
  if (ipMap.size > 5000) {
    for (const [k, v] of ipMap.entries()) {
      if (now > v.reset) ipMap.delete(k);
    }
  }

  const entry = ipMap.get(ip);

  if (!entry || now > entry.reset) {
    ipMap.set(ip, { count: 1, reset: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.reset - now) / 1000);
    return { ok: false, retryAfter };
  }

  entry.count += 1;
  return { ok: true };
}

// Sanitiza input para evitar prompt injection
export function sanitizeInput(text: string, maxLength: number): { ok: boolean; value: string; reason?: string } {
  if (!text || typeof text !== "string") return { ok: false, value: "", reason: "Entrada inválida." };

  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, value: "", reason: "Mensagem vazia." };
  if (trimmed.length > maxLength) {
    return { ok: false, value: "", reason: `Mensagem muito longa. Máximo ${maxLength} caracteres.` };
  }

  // Detecta tentativas de prompt injection
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/i,
    /forget\s+(all\s+)?(previous|above|prior)/i,
    /you\s+are\s+now\s+(a|an)\s+/i,
    /act\s+as\s+(a|an)\s+/i,
    /pretend\s+(you\s+are|to\s+be)/i,
    /new\s+instructions?\s*:/i,
    /system\s*prompt/i,
    /\bDAN\b/,
    /jailbreak/i,
    /<\s*script/i,
    /javascript\s*:/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmed)) {
      return { ok: false, value: "", reason: "Mensagem não permitida." };
    }
  }

  // Limpa caracteres de controle mantendo texto normal
  const cleaned = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return { ok: true, value: cleaned };
}

// Valida categoria da rota addiction (whitelist estrita, Unicode normalizado)
const VALID_CATEGORIES = new Set([
  "alimentação emocional","relacionamentos tóxicos","procrastinação",
  "vício em redes sociais","ansiedade crônica","álcool","cigarro",
].map((c) => c.normalize("NFC")));

export function validateCategory(cat: string): boolean {
  return VALID_CATEGORIES.has(cat.normalize("NFC").toLowerCase().trim());
}

// Obtém IP real da requisição
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
