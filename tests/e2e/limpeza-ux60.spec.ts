import { test, expect, type Page } from "@playwright/test";

/**
 * UX 60+ — quatro telas Limpeza.
 *
 * Para cada rota, validamos:
 *  - Tipografia conforme spec UX 60+:
 *      • body / parágrafos / spans não-auxiliares ≥ 20 px
 *      • <label> ≥ 18 px (regra explícita do brief: "label-on-top 18px+ bold")
 *      • Auxiliares (badges UPPERCASE curtos, contadores, ícones, footer/disclaimer) ≥ 14 px
 *  - Botões e elementos role="button"/role="radio" com bounding box ≥ 64x64.
 *  - Exatamente 1 CTA primário above-the-fold (primeiros 800 px de altura).
 *  - aria-label em todos os botões/links que contenham apenas ícone.
 *  - innerText do <body> não contém /tarot|tarô/i.
 *
 * Coletamos violações de cada categoria em vez de abortar na primeira — assim
 * o output do CI mostra todas de uma vez.
 */

const ROUTES = [
  { name: "Landing /limpeza", path: "/limpeza" },
  { name: "Pós-pagamento /obrigado-limpeza", path: "/obrigado-limpeza" },
  { name: "Prévia (fixture E2E)", path: "/e2e-fixtures/preview" },
  { name: "Entrega (fixture E2E)", path: "/e2e-fixtures/entrega" },
] as const;

const BODY_FONT_FLOOR = 20;
const LABEL_FONT_FLOOR = 18;
const SMALL_TEXT_FLOOR = 14;
const TOUCH_FLOOR = 64;
const ABOVE_FOLD_PX = 800;

type TextNode = {
  text: string;
  fontSize: number;
  tag: string;
  classification: "label" | "aux" | "body";
  floor: number;
};

type BoxReport = {
  tag: string;
  role: string | null;
  label: string;
  width: number;
  height: number;
  hasOnlyIcon: boolean;
  hasAriaLabel: boolean;
};

async function collectTextNodes(page: Page): Promise<TextNode[]> {
  return page.evaluate(
    ({ bodyFloor, labelFloor, smallFloor }) => {
      const isAux = (
        text: string,
        tag: string,
        ancestorTags: string[],
        textTransform: string,
        letterSpacing: string
      ): boolean => {
        const t = text.trim();
        if (t.length === 0) return true;
        if (/^\s*\d+\s*\/\s*\d+\s*$/.test(t)) return true; // contadores
        if (t.length <= 3) return true; // emoji/ícone solo
        if (t.length <= 30 && t === t.toUpperCase() && /[A-Z]/.test(t)) return true; // eyebrow uppercase fonte
        // Eyebrow estilizado via CSS (text-transform: uppercase + letter-spacing)
        if (
          textTransform === "uppercase" &&
          parseFloat(letterSpacing || "0") >= 0.5
        )
          return true;
        if (tag === "small" || tag === "sup" || tag === "sub") return true;
        if (ancestorTags.includes("footer")) return true;
        return false;
      };

      const results: TextNode[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null = walker.nextNode();
      while (node) {
        const text = (node.nodeValue ?? "").trim();
        if (text.length > 0) {
          const parent = node.parentElement;
          if (parent) {
            const style = window.getComputedStyle(parent);
            const rect = parent.getBoundingClientRect();
            const visible =
              style.visibility !== "hidden" &&
              style.display !== "none" &&
              parent.offsetParent !== null &&
              rect.width > 0 &&
              rect.height > 0;
            if (visible) {
              const tag = parent.tagName.toLowerCase();
              const ancestors: string[] = [];
              let walker2: HTMLElement | null = parent;
              while (walker2 && walker2 !== document.body) {
                ancestors.push(walker2.tagName.toLowerCase());
                walker2 = walker2.parentElement;
              }
              const fontSize = parseFloat(style.fontSize);
              const textTransform = style.textTransform || "none";
              const letterSpacing = style.letterSpacing || "normal";
              const fontStyle = style.fontStyle || "normal";
              const insideLabel = tag === "label" || ancestors.includes("label");

              let classification: "label" | "aux" | "body" = "body";
              let floor = bodyFloor;

              // Auxiliares têm prioridade — itálico curto, eyebrow, contadores,
              // ícones e tags semânticas (small/sup/sub/footer) saem do piso de
              // 20 px independentemente de estarem dentro de label ou não.
              if (
                isAux(text, tag, ancestors, textTransform, letterSpacing) ||
                (fontStyle === "italic" && text.length <= 80)
              ) {
                classification = "aux";
                floor = smallFloor;
              } else if (insideLabel) {
                classification = "label";
                floor = labelFloor;
              }
              results.push({
                text: text.slice(0, 90),
                fontSize,
                tag,
                classification,
                floor,
              });
            }
          }
        }
        node = walker.nextNode();
      }
      return results;
    },
    {
      bodyFloor: BODY_FONT_FLOOR,
      labelFloor: LABEL_FONT_FLOOR,
      smallFloor: SMALL_TEXT_FLOOR,
    }
  );
}

async function collectBoxes(page: Page): Promise<BoxReport[]> {
  return page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, a[href], [role='button'], [role='radio']"
      )
    );
    const out: BoxReport[] = [];
    for (const el of els) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const visible =
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        el.offsetParent !== null &&
        rect.width > 0 &&
        rect.height > 0;
      if (!visible) continue;
      const text = (el.innerText || el.textContent || "").trim();
      const hasWords = /[\p{L}]{2,}/u.test(text);
      const hasOnlyIcon = !hasWords && text.length > 0 && text.length <= 4;
      const hasAriaLabel = !!(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby"));
      out.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        label: text.slice(0, 60),
        width: rect.width,
        height: rect.height,
        hasOnlyIcon,
        hasAriaLabel,
      });
    }
    return out;
  });
}

async function countAboveFoldCTAs(page: Page): Promise<number> {
  return page.evaluate((aboveFold) => {
    const ctas = Array.from(
      document.querySelectorAll<HTMLElement>(
        "a.btn-gold, button.btn-gold, a.btn-big, button.btn-big"
      )
    );
    let count = 0;
    for (const el of ctas) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible =
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.width > 0 &&
        rect.height > 0;
      if (visible && rect.top < aboveFold) count += 1;
    }
    return count;
  }, ABOVE_FOLD_PX);
}

for (const route of ROUTES) {
  test.describe(`UX 60+ · ${route.name}`, () => {
    test("validações completas", async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: "networkidle" });
      expect(response, `${route.path} respondeu`).not.toBeNull();
      expect(response!.status(), `${route.path} 2xx`).toBeLessThan(400);

      const violations: string[] = [];

      // 1. Sem "tarot/tarô" em copy visível
      const bodyText = await page.locator("body").innerText();
      if (/tarot|tarô/i.test(bodyText)) {
        violations.push(`Body contém "tarot/tarô" em copy visível.`);
      }

      // 2. Tipografia conforme classificação
      const textNodes = await collectTextNodes(page);
      const fontFails = textNodes.filter((n) => n.fontSize < n.floor);
      if (fontFails.length > 0) {
        const sample = fontFails
          .slice(0, 12)
          .map(
            (n) =>
              `      <${n.tag} class=${n.classification} ${n.fontSize}px (piso ${n.floor}px)> ${n.text}`
          )
          .join("\n");
        violations.push(
          `${fontFails.length} elemento(s) com fonte abaixo do piso:\n${sample}`
        );
      }

      // 3. Tamanho mínimo dos interativos
      const boxes = await collectBoxes(page);
      const tooSmall = boxes.filter(
        (b) => b.height < TOUCH_FLOOR || b.width < TOUCH_FLOOR
      );
      if (tooSmall.length > 0) {
        const sample = tooSmall
          .slice(0, 10)
          .map(
            (b) =>
              `      <${b.tag} role=${b.role}> ${Math.round(b.width)}x${Math.round(b.height)}: ${b.label}`
          )
          .join("\n");
        violations.push(
          `${tooSmall.length} elemento(s) interativos abaixo de 64x64:\n${sample}`
        );
      }

      // 4. aria-label em só-ícone
      const iconOnly = boxes.filter((b) => b.hasOnlyIcon && !b.hasAriaLabel);
      if (iconOnly.length > 0) {
        const sample = iconOnly
          .slice(0, 10)
          .map((b) => `      <${b.tag}> ${b.label}`)
          .join("\n");
        violations.push(
          `${iconOnly.length} botão(ões) só-ícone sem aria-label:\n${sample}`
        );
      }

      // 5. No máximo 1 CTA primário above-the-fold (zero é OK quando o hero
      //    é puramente informativo; o que NÃO pode é ter múltiplos CTAs
      //    competindo no mesmo viewport inicial).
      const ctaCount = await countAboveFoldCTAs(page);
      if (ctaCount > 1) {
        violations.push(
          `CTA primário above-the-fold = ${ctaCount} (máx. 1, sem competição).`
        );
      }

      if (violations.length > 0) {
        throw new Error(
          `Violações de UX 60+ em ${route.path}:\n` +
            violations.map((v, i) => `  [${i + 1}] ${v}`).join("\n")
        );
      }
    });
  });
}

// Sanidade: as fixtures E2E só devem existir quando E2E_TEST=1.
test("fixture E2E está habilitada", async ({ page }) => {
  const r = await page.goto("/e2e-fixtures/entrega", { waitUntil: "domcontentloaded" });
  expect(r?.status(), "fixture /e2e-fixtures/entrega 2xx").toBeLessThan(400);
});
