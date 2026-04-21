import type { Plan } from "@/lib/types";

export function PlanBadge({ plan }: { plan: Plan }) {
  const map: Record<Plan, { bg: string; label: string }> = {
    free: { bg: "bg-gray-500/30 text-gray-200 border-gray-400/40", label: "Grátis" },
    basic: { bg: "bg-purple/40 text-purple-200 border-purple-400/40", label: "Basic" },
    premium: { bg: "bg-gold/20 text-gold border-gold", label: "Premium" },
  };
  const s = map[plan];
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${s.bg}`} style={plan === "premium" ? { color: "#d4af37", borderColor: "#d4af37" } : {}}>
      {s.label}
    </span>
  );
}
