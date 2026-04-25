// Gera 6 números de sorte determinísticos por usuário+dia
// Mesmo usuário, mesmo dia => mesmos 6 números (refresh à meia-noite)
export function dailyLuckyNumbers(userId: string, date: Date = new Date()): number[] {
  const dateKey = date.toISOString().slice(0, 10);
  const seed = hashString(`${userId}::${dateKey}`);

  const numbers = new Set<number>();
  let cursor = seed;
  while (numbers.size < 6) {
    cursor = (cursor * 1103515245 + 12345) & 0x7fffffff;
    const n = (cursor % 60) + 1;
    numbers.add(n);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) & 0x7fffffff;
  }
  return h || 1;
}

export function nextRefreshHours(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60)));
}
