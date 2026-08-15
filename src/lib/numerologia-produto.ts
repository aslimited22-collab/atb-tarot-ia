// Produto "Numerologia" (R$45) — geração do mapa numerológico por IA.
//
// NÃO confundir com src/lib/numerology.ts (feature Premium do dashboard):
// este arquivo é do PRODUTO avulso vendido em /numerologia. Ele REUSA o
// cálculo pitagórico clássico de personalNumerology() (nome + nascimento →
// destino/alma/expressão/ano pessoal) pra ancorar o texto da IA em números
// calculados de verdade — a IA escreve os SIGNIFICADOS, não inventa números.
//
// Filosofia (mesma de numerology.ts): NÃO promete vitória em jogos, dinheiro
// garantido, cura ou diagnóstico. Números são guias espirituais.

import { deepseekComplete } from "./deepseek";
import { personalNumerology, dailyLuckyNumbers } from "./numerology";

const SYSTEM = `Você é a voz espiritual acolhedora da ATB, guia de numerologia. Escreva em português brasileiro, linguagem simples, emocional e respeitosa para pessoas adultas. Adapte o tratamento (ela/ele, mesma/mesmo) ao gênero que o nome da pessoa sugere; na dúvida, use frases neutras. Não prometa vitória em jogos de azar, loteria, dinheiro garantido, cura, milagre ou diagnóstico. O conteúdo é espiritual, simbólico, reflexivo e de entretenimento. Use frases curtas e fáceis de entender.`;

export type NumerologiaJson = {
  title: string;
  opening: string;
  numeros: Array<{
    numero: number;
    nome: string; // "Número do Destino", "Número da Alma", ...
    significado: string; // o que esse número revela na vida DELA
    como_usar: string; // datas, decisões, proteção — orientação prática
  }>;
  numeros_da_sorte: number[]; // 6 números pessoais (1-60)
  orientacao_geral: string; // como e quando usar os números no dia a dia
  closing: string;
  disclaimer: string;
};

export type NumerologiaInput = {
  name: string;
  birthDate: string; // "YYYY-MM-DD"
};

/**
 * Gera o mapa numerológico completo: calcula os números localmente
 * (determinístico) e pede à IA os significados/orientações em JSON.
 */
export async function generateNumerologiaReading(input: NumerologiaInput): Promise<{
  json: NumerologiaJson;
  text: string;
  raw: string;
}> {
  const nums = personalNumerology(input.name, input.birthDate);
  if (!nums) {
    throw new Error("Nome ou data de nascimento inválidos pra numerologia");
  }
  // Números da sorte pessoais: seed = nome+nascimento (estável pra sempre —
  // o PDF baixado hoje e daqui a 20 dias mostra os MESMOS números).
  const sorte = dailyLuckyNumbers(
    `${input.name.trim().toLowerCase()}::${input.birthDate}`,
    new Date(`${input.birthDate}T12:00:00Z`)
  );

  const userPrompt = `Cliente: ${input.name}
Data de nascimento: ${input.birthDate}

Números calculados pela numerologia pitagórica clássica (NÃO invente outros):
- Número do Destino: ${nums.destino}
- Número da Alma: ${nums.alma}
- Número de Expressão: ${nums.expressao}
- Ano Pessoal: ${nums.anoPessoal}
- Números da sorte pessoais: ${sorte.join(", ")}

Gere um JSON válido com esta estrutura:

{
  "title": "título curto e emocional do mapa numerológico de ${input.name.split(" ")[0]}",
  "opening": "abertura acolhedora usando o primeiro nome, explicando que este mapa nasceu do nome completo e da data de nascimento dela",
  "numeros": [
    { "numero": ${nums.destino}, "nome": "Número do Destino", "significado": "o que o número ${nums.destino} revela sobre o caminho de vida dela", "como_usar": "orientação prática: em que momentos e decisões se apoiar nesse número" },
    { "numero": ${nums.alma}, "nome": "Número da Alma", "significado": "o que o número ${nums.alma} revela sobre o coração e os desejos dela", "como_usar": "orientação prática" },
    { "numero": ${nums.expressao}, "nome": "Número de Expressão", "significado": "o que o número ${nums.expressao} revela sobre os dons e talentos dela", "como_usar": "orientação prática" },
    { "numero": ${nums.anoPessoal}, "nome": "Ano Pessoal", "significado": "a energia do ano atual pra ela segundo o número ${nums.anoPessoal}", "como_usar": "orientação prática pros próximos meses" }
  ],
  "numeros_da_sorte": [${sorte.join(", ")}],
  "orientacao_geral": "como e quando usar os números da sorte no dia a dia: datas importantes, decisões, momentos de proteção — SEM prometer ganhos em jogos ou loteria",
  "closing": "fechamento acolhedor da ATB, convidando a guardar o mapa com carinho",
  "disclaimer": "mensagem curta: orientação espiritual e reflexiva, não substitui aconselhamento profissional, sem garantia de resultados materiais"
}

Limites:
- Máximo 900 palavras no total
- Linguagem simples, frases curtas, tom acolhedor e místico
- Sem promessas absolutas, sem linguagem técnica, sem parecer robô
- Os campos "numero" e "numeros_da_sorte" devem manter EXATAMENTE os valores informados

Responda APENAS com o JSON puro, sem markdown, sem comentários, sem texto antes ou depois.`;

  const raw = await deepseekComplete([
    { role: "system", content: SYSTEM },
    { role: "user", content: userPrompt },
  ]);

  const cleaned = raw.replace(/```json|```/g, "").trim();
  const json = JSON.parse(cleaned) as NumerologiaJson;

  // Valida estrutura mínima e REANCORA os números calculados (a IA não manda neles)
  if (!json.title || !json.opening || !Array.isArray(json.numeros) || json.numeros.length < 4) {
    throw new Error("Resposta da IA com estrutura inválida");
  }
  const nomes = ["Número do Destino", "Número da Alma", "Número de Expressão", "Ano Pessoal"];
  const valores = [nums.destino, nums.alma, nums.expressao, nums.anoPessoal];
  json.numeros = json.numeros.slice(0, 4).map((n, i) => ({
    numero: valores[i],
    nome: nomes[i],
    significado: n.significado || "Um número de força e proteção no seu caminho.",
    como_usar: n.como_usar || "Guarde este número com carinho nos momentos de decisão.",
  }));
  json.numeros_da_sorte = sorte;
  if (!json.disclaimer) {
    json.disclaimer =
      "Este mapa é uma orientação espiritual e reflexiva. Não substitui aconselhamento profissional e não garante resultados materiais.";
  }

  // Texto único (pra readings.full_text / busca / fallback de e-mail)
  const text = [
    json.title,
    json.opening,
    ...json.numeros.map((n) => `${n.nome}: ${n.numero}\n${n.significado}\nComo usar: ${n.como_usar}`),
    `Seus números da sorte: ${json.numeros_da_sorte.join(", ")}`,
    json.orientacao_geral,
    json.closing,
    json.disclaimer,
  ].join("\n\n");

  return { json, text, raw };
}
