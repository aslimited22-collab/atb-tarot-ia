// V2 da Limpeza Espiritual - prompts e helpers DeepSeek isolados.
// NAO altera o produto V1 (chat 3 msgs em /dashboard/limpeza-espiritual).

import { deepseekComplete } from "./deepseek";

const PREVIEW_SYSTEM = `Você é a voz espiritual acolhedora da ATB Tarot. Escreva em linguagem simples, emocional e respeitosa para mulheres adultas. Não prometa cura, milagre, retorno amoroso garantido, dinheiro garantido, diagnóstico ou solução médica. O conteúdo é espiritual, simbólico, reflexivo e de entretenimento.`;

const FULL_SYSTEM = `Você é a voz espiritual acolhedora da ATB Tarot. Escreva em linguagem simples, emocional e respeitosa para mulheres adultas. Não prometa cura, milagre, retorno amoroso garantido, dinheiro garantido, diagnóstico ou solução médica. O conteúdo é espiritual, simbólico, reflexivo e de entretenimento. Use frases curtas e fáceis de entender.`;

export type PreviewInput = {
  name: string;
  theme: string;
  sign?: string | null;
  question: string;
};

export async function generatePreview(input: PreviewInput): Promise<string> {
  const userPrompt = `Nome: ${input.name}
Tema: ${input.theme}
Signo: ${input.sign || "não informado"}
Situação: ${input.question}

Gere uma prévia espiritual curta, com no máximo 80 palavras, usando o nome da pessoa e criando vontade de desbloquear a Limpeza Espiritual completa. Não diga que é IA. Não use linguagem técnica. Não faça promessas absolutas.`;

  const text = await deepseekComplete([
    { role: "system", content: PREVIEW_SYSTEM },
    { role: "user", content: userPrompt },
  ]);

  return text.trim();
}

export type FullReadingInput = PreviewInput & {
  language?: string;
};

export type FullReadingJson = {
  title: string;
  opening: string;
  spiritual_reading: string;
  cleansing_message: string;
  protection_message: string;
  next_steps: string[];
  closing: string;
  disclaimer: string;
};

export async function generateFullReading(input: FullReadingInput): Promise<{
  json: FullReadingJson;
  text: string;
  raw: string;
}> {
  const language = input.language || "pt-BR";
  const userPrompt = `Idioma: ${language}
Nome: ${input.name}
Tema: ${input.theme}
Signo: ${input.sign || "não informado"}
Situação: ${input.question}

Gere um JSON válido com esta estrutura:

{
  "title": "título curto e emocional",
  "opening": "abertura acolhedora usando o nome da pessoa",
  "spiritual_reading": "leitura espiritual personalizada com base no tema e na situação",
  "cleansing_message": "mensagem simbólica de limpeza espiritual, sem instruções perigosas",
  "protection_message": "mensagem de proteção espiritual",
  "next_steps": [
    "passo simples e seguro 1",
    "passo simples e seguro 2",
    "passo simples e seguro 3"
  ],
  "closing": "fechamento acolhedor da ATB",
  "disclaimer": "mensagem curta dizendo que é uma orientação espiritual e reflexiva, não substitui ajuda profissional"
}

Limites:
- Máximo 900 palavras no total
- Linguagem simples
- Frases curtas
- Tom acolhedor
- Sem promessas absolutas
- Sem linguagem técnica
- Sem parecer robô

Responda APENAS com o JSON puro, sem markdown, sem comentários, sem texto antes ou depois.`;

  const raw = await deepseekComplete([
    { role: "system", content: FULL_SYSTEM },
    { role: "user", content: userPrompt },
  ]);

  // Limpa fences de markdown se vierem
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const json = JSON.parse(cleaned) as FullReadingJson;

  // Valida estrutura mínima
  if (!json.title || !json.opening || !json.spiritual_reading) {
    throw new Error("Resposta da IA com estrutura inválida");
  }
  if (!Array.isArray(json.next_steps) || json.next_steps.length < 1) {
    json.next_steps = [
      "Acenda uma vela branca em local seguro e respire fundo três vezes.",
      "Fale com seu coração o que precisa ser limpo, em voz alta.",
      "Beba um copo d'água com intenção de paz e descanse.",
    ];
  }

  // Texto único pra preview/SEO
  const text = [
    json.title,
    json.opening,
    json.spiritual_reading,
    json.cleansing_message,
    json.protection_message,
    json.next_steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    json.closing,
    json.disclaimer,
  ].join("\n\n");

  return { json, text, raw };
}

export const VALID_THEMES = [
  "energia_pesada",
  "inveja",
  "amor_travado",
  "caminhos_fechados",
  "separacao",
  "protecao_espiritual",
  "dinheiro_trabalho",
  "tristeza_coracao",
] as const;

export type Theme = (typeof VALID_THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  energia_pesada: "Energia pesada",
  inveja: "Inveja",
  amor_travado: "Amor travado",
  caminhos_fechados: "Caminhos fechados",
  separacao: "Separação",
  protecao_espiritual: "Proteção espiritual",
  dinheiro_trabalho: "Dinheiro e trabalho",
  tristeza_coracao: "Tristeza no coração",
};

export const VALID_SIGNS = [
  "aries", "touro", "gemeos", "cancer", "leao", "virgem",
  "libra", "escorpiao", "sagitario", "capricornio", "aquario", "peixes",
];

export const SIGN_LABELS: Record<string, string> = {
  aries: "Áries", touro: "Touro", gemeos: "Gêmeos", cancer: "Câncer",
  leao: "Leão", virgem: "Virgem", libra: "Libra", escorpiao: "Escorpião",
  sagitario: "Sagitário", capricornio: "Capricórnio", aquario: "Aquário", peixes: "Peixes",
};
