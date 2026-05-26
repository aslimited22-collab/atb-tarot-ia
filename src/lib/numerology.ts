// Numerologia espiritual da ATB — geração determinística de números da sorte.
// Mesmo user+dia => mesmos números (refresh à meia-noite).
//
// Filosofia: NÃO promete vitória em jogos de azar. Os números são "guias
// espirituais vibracionalmente alinhados". Disclaimer obrigatório no produto.

// Hash simples e estável (não criptográfico) pra seed determinística
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) & 0x7fffffff;
  }
  return h || 1;
}

// PRNG linear congruencial usando seed
function lcg(seed: number): () => number {
  let cursor = seed;
  return () => {
    cursor = (cursor * 1103515245 + 12345) & 0x7fffffff;
    return cursor;
  };
}

// Pega N números únicos no intervalo [1, max] usando o PRNG
function pickUnique(rng: () => number, count: number, max: number): number[] {
  const set = new Set<number>();
  while (set.size < count) {
    set.add((rng() % max) + 1);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Gera 6 números de sorte determinísticos por usuário+dia (1-60).
 * Compatibilidade — função original mantida.
 */
export function dailyLuckyNumbers(userId: string, date: Date = new Date()): number[] {
  const dateKey = date.toISOString().slice(0, 10);
  const seed = hashString(`${userId}::${dateKey}`);
  return pickUnique(lcg(seed), 6, 60);
}

/**
 * Combinações espirituais maiores — gera 3 conjuntos diferentes pra
 * Consulta Completa. Cada um usa seed derivada de user+dia mas com
 * sufixo diferente pra evitar overlap entre combinações.
 */
export function luckyCombinations(
  userId: string,
  date: Date = new Date()
): { forte: number[]; quantica: number[]; mistica: number[] } {
  const dateKey = date.toISOString().slice(0, 10);
  return {
    // 10 números no universo 1-60 (jogos com mais dezenas)
    forte: pickUnique(lcg(hashString(`${userId}::${dateKey}::forte`)), 10, 60),
    // 15 números no universo 1-25 (jogos de 25 dezenas)
    quantica: pickUnique(lcg(hashString(`${userId}::${dateKey}::quantica`)), 15, 25),
    // 5 números no universo 1-80 (jogos com 80 dezenas)
    mistica: pickUnique(lcg(hashString(`${userId}::${dateKey}::mistica`)), 5, 80),
  };
}

// Reduz número até 1 dígito (1-9). Mantém 11 e 22 como mestres (mas pra
// simplicidade aqui reduz tudo pra 1-9).
function reduceToDigit(n: number): number {
  while (n > 9) {
    n = String(n).split("").reduce((acc, d) => acc + Number(d), 0);
  }
  return n || 9; // 0 vira 9 por convenção
}

// Conversão pitagórica letra → número (A=1, B=2, ... I=9, J=1, ...)
const LETTER_VALUES: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < alphabet.length; i++) {
    m[alphabet[i]] = (i % 9) + 1;
  }
  return m;
})();

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toUpperCase()
    .replace(/[^A-Z]/g, ""); // só letras
}

function sumByPredicate(name: string, predicate: (ch: string) => boolean): number {
  const clean = normalizeName(name);
  let sum = 0;
  for (const ch of clean) {
    if (predicate(ch)) {
      sum += LETTER_VALUES[ch] ?? 0;
    }
  }
  return sum;
}

/**
 * Mapa numerológico pessoal — calcula 4 números chave do nome+data nascimento.
 * Usa numerologia pitagórica clássica.
 *
 * @param fullName ex: "Maria Aparecida Severeano"
 * @param birthDate ISO date string "YYYY-MM-DD"
 */
export function personalNumerology(
  fullName: string,
  birthDate: string
): { destino: number; alma: number; expressao: number; anoPessoal: number } | null {
  // Validações
  if (!fullName || fullName.trim().length < 2) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;

  const [yearStr, monthStr, dayStr] = birthDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;

  // Número do Destino = soma dígitos data nascimento reduzida
  const destinoSum = String(year).split("").reduce((a, d) => a + Number(d), 0)
    + String(month).split("").reduce((a, d) => a + Number(d), 0)
    + String(day).split("").reduce((a, d) => a + Number(d), 0);

  // Número da Alma = soma vogais do nome
  const almaSum = sumByPredicate(fullName, (ch) => VOWELS.has(ch));

  // Número de Expressão = soma todas as letras do nome
  const expressaoSum = sumByPredicate(fullName, () => true);

  // Ano Pessoal = (dia + mês + ano atual) reduzido
  const currentYear = new Date().getUTCFullYear();
  const anoSum = day + month + String(currentYear).split("").reduce((a, d) => a + Number(d), 0);

  return {
    destino: reduceToDigit(destinoSum),
    alma: reduceToDigit(almaSum),
    expressao: reduceToDigit(expressaoSum),
    anoPessoal: reduceToDigit(anoSum),
  };
}

/**
 * Hora propícia do dia — formato "HH:MM" determinístico por user+dia.
 * Calculado de forma estável (não muda no decorrer do dia).
 */
export function luckyHour(userId: string, date: Date = new Date()): string {
  const dateKey = date.toISOString().slice(0, 10);
  const seed = hashString(`${userId}::${dateKey}::hora`);
  // Hora entre 6h e 22h (horário "ativo")
  const hour = 6 + (seed % 17);
  const minute = (seed >> 5) % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function nextRefreshHours(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60)));
}
