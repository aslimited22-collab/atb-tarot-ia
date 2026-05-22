// Fuzzy email matching pra resolver caso Josi Barkert:
//   - Cliente paga com email A (ex: josi@barkert.com.br)
//   - Cliente já tem conta com email B (ex: barkert.josi@gmail.com)
//   - Sem fuzzy match, purchase fica órfã (user_id = null) e cliente não vê a compra
//
// Estratégia em camadas (do mais seguro pro mais agressivo):
//   1. Exact match — `josi@barkert.com.br` ↔ `josi@barkert.com.br`
//   2. Reverse local/domain root — `josi@barkert.com.br` ↔ `barkert.josi@*` ou `josi.barkert@*`
//   3. Name match — full_name contém primeiro+último nome do customer
//
// Tudo é loggado via logInfo("webhook.fuzzy_match") pra auditoria. Caller é
// responsável por marcar purchases.fuzzy_matched = true se quiser distinguir
// linkagem fuzzy de linkagem exata.

import { createAdminClient } from "@/lib/supabase/admin";
import { logInfo } from "@/lib/logger";

type AdminClient = ReturnType<typeof createAdminClient>;

export type FuzzyMatchResult = {
  user: { id: string; email: string } | null;
  matchType: "exact" | "reverse" | "name" | null;
  // Se fuzzy_matched=true, caller deve marcar a coluna na tabela purchases
  fuzzy: boolean;
};

/**
 * Busca usuário com tolerância a variações de email. Útil pra linkar purchases
 * a contas existentes mesmo quando email não bate exatamente.
 *
 * @param admin - Supabase admin client (createAdminClient)
 * @param purchaseEmail - email usado no pagamento (Kiwify/Stripe)
 * @param customerName - nome completo do cliente (opcional, melhora chance de match)
 */
export async function findUserByFuzzyEmail(
  admin: AdminClient,
  purchaseEmail: string,
  customerName: string | null | undefined
): Promise<FuzzyMatchResult> {
  const emailLower = purchaseEmail.toLowerCase().trim();
  if (!emailLower || !emailLower.includes("@")) {
    return { user: null, matchType: null, fuzzy: false };
  }

  // 1. EXACT MATCH (a mesma query que webhook já faz; redundante mas seguro)
  const { data: exact } = await admin
    .from("users")
    .select("id, email")
    .eq("email", emailLower)
    .maybeSingle();
  if (exact?.id) {
    return { user: { id: exact.id, email: exact.email }, matchType: "exact", fuzzy: false };
  }

  // 2. REVERSE LOCAL/DOMAIN ROOT
  // Ex: "josi@barkert.com.br" → local="josi", domain="barkert.com.br", root="barkert"
  // Procura "barkert.josi@*", "josi.barkert@*", "barkertjosi@*", "josibarkert@*"
  const [local, domain] = emailLower.split("@");
  if (local && domain && local.length >= 3) {
    const domainRoot = domain.split(".")[0];
    if (domainRoot && domainRoot.length >= 3 && domainRoot !== local) {
      const patterns = [
        `${domainRoot}.${local}@`,
        `${local}.${domainRoot}@`,
        `${domainRoot}${local}@`,
        `${local}${domainRoot}@`,
      ];
      for (const pattern of patterns) {
        const { data: rows } = await admin
          .from("users")
          .select("id, email")
          .ilike("email", `${pattern}%`)
          .limit(1);
        if (rows && rows.length > 0 && rows[0]?.id) {
          logInfo("webhook.fuzzy_match", "reverse pattern matched", {
            purchaseEmail: emailLower,
            matchedPattern: pattern,
            userEmail: rows[0].email,
          });
          return {
            user: { id: rows[0].id, email: rows[0].email },
            matchType: "reverse",
            fuzzy: true,
          };
        }
      }
    }
  }

  // 3. NAME MATCH — só se nome tem 2+ palavras com 3+ chars cada
  if (customerName) {
    const words = customerName.trim().split(/\s+/).filter((w) => w.length >= 3);
    if (words.length >= 2) {
      const firstName = words[0].toLowerCase();
      const lastName = words[words.length - 1].toLowerCase();
      const { data: nameRows } = await admin
        .from("users")
        .select("id, email, full_name")
        .ilike("full_name", `%${firstName}%${lastName}%`)
        .order("created_at", { ascending: false })
        .limit(2);
      // Só linka se UM match (mais de 1 → ambíguo, melhor deixar manual)
      if (nameRows && nameRows.length === 1 && nameRows[0]?.id) {
        logInfo("webhook.fuzzy_match", "name pattern matched", {
          purchaseEmail: emailLower,
          customerName,
          userEmail: nameRows[0].email,
        });
        return {
          user: { id: nameRows[0].id, email: nameRows[0].email },
          matchType: "name",
          fuzzy: true,
        };
      }
    }
  }

  return { user: null, matchType: null, fuzzy: false };
}
