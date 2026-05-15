import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";

export const metadata = {
  title: "Política de Cookies — ATB",
  description: "Como usamos cookies e como você pode gerenciá-los.",
};

const COMPANY = {
  dpoEmail: "[PREENCHER: privacidade@atbtartot.com]",
};

const baseTextStyle = { fontSize: 19, lineHeight: 1.75, color: "#fbf8ff", fontWeight: 500 } as const;
const h2Style = { fontSize: "1.6rem", color: "#e8b84b", marginTop: 36, marginBottom: 14, fontWeight: 700 } as const;
const tableCellStyle = { padding: "14px 16px", borderBottom: "1px solid rgba(196,181,253,0.2)", fontSize: 17, lineHeight: 1.5, color: "#fbf8ff" } as const;

export default function CookiesPage() {
  const { t } = getServerT();
  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <main style={{ background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", minHeight: "100vh", color: "#fbf8ff", padding: "48px 20px 80px" }}>
      <article style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-block", color: "#c4b5fd", fontSize: 18, fontWeight: 600, textDecoration: "none", marginBottom: 24, padding: "10px 14px", minHeight: 44 }}>
          ← {t("v2.back")}
        </Link>

        <h1 className="serif" style={{ fontSize: "clamp(2.4rem, 6vw, 3.4rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 18, fontWeight: 700 }}>
          Política de Cookies
        </h1>
        <p style={{ fontSize: 17, color: "#c4b5fd", marginBottom: 36, fontWeight: 500 }}>
          Última atualização: {today}
        </p>

        <h2 style={h2Style}>O que são cookies</h2>
        <p style={baseTextStyle}>
          Cookies são pequenos arquivos de texto que o seu navegador salva quando você visita um site.
          Eles servem pra <strong>lembrar quem você é</strong>, manter sua sessão de login ativa e personalizar
          sua experiência. Sem alguns deles, o site simplesmente não funciona.
        </p>

        <h2 style={h2Style}>Quais cookies usamos</h2>
        <p style={baseTextStyle}>
          Usamos <strong>apenas cookies essenciais e funcionais</strong>. Não usamos cookies de publicidade
          ou rastreamento entre sites.
        </p>

        <div style={{ overflowX: "auto", marginTop: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "rgba(30,0,64,0.6)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(196,181,253,0.25)" }}>
            <thead>
              <tr style={{ background: "rgba(232,184,75,0.12)" }}>
                <th style={{ ...tableCellStyle, fontWeight: 700, color: "#e8b84b", textAlign: "left" }}>Nome</th>
                <th style={{ ...tableCellStyle, fontWeight: 700, color: "#e8b84b", textAlign: "left" }}>Categoria</th>
                <th style={{ ...tableCellStyle, fontWeight: 700, color: "#e8b84b", textAlign: "left" }}>Para que serve</th>
                <th style={{ ...tableCellStyle, fontWeight: 700, color: "#e8b84b", textAlign: "left" }}>Duração</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tableCellStyle}><code>sb-*-auth-token</code></td>
                <td style={tableCellStyle}>Essencial</td>
                <td style={tableCellStyle}>Mantém você logada. Sem esse cookie você precisa logar a cada página.</td>
                <td style={tableCellStyle}>30 dias</td>
              </tr>
              <tr>
                <td style={tableCellStyle}><code>atb_locale</code></td>
                <td style={tableCellStyle}>Funcional</td>
                <td style={tableCellStyle}>Lembra o idioma que você escolheu (PT, EN, ES, DE, IT, JA).</td>
                <td style={tableCellStyle}>1 ano</td>
              </tr>
              <tr>
                <td style={tableCellStyle}><code>atb_cookie_consent</code></td>
                <td style={tableCellStyle}>Essencial</td>
                <td style={tableCellStyle}>Guarda sua escolha sobre cookies (pra não mostrar o banner toda vez).</td>
                <td style={tableCellStyle}>1 ano</td>
              </tr>
              <tr>
                <td style={tableCellStyle}><code>admin_secret</code></td>
                <td style={tableCellStyle}>Essencial (admin)</td>
                <td style={tableCellStyle}>Só presente em painel admin (não para clientes finais).</td>
                <td style={tableCellStyle}>30 dias</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 style={h2Style}>Cookies que NÃO usamos</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li style={{ ...baseTextStyle, marginBottom: 10 }}>❌ Google Analytics</li>
          <li style={{ ...baseTextStyle, marginBottom: 10 }}>❌ Facebook Pixel</li>
          <li style={{ ...baseTextStyle, marginBottom: 10 }}>❌ Cookies de retargeting / publicidade</li>
          <li style={{ ...baseTextStyle, marginBottom: 10 }}>❌ Cookies de terceiros para tracking entre sites</li>
        </ul>

        <h2 style={h2Style}>Como gerenciar</h2>
        <p style={baseTextStyle}>
          Você pode bloquear cookies nas configurações do seu navegador. <strong>Atenção:</strong> bloquear
          cookies essenciais pode fazer com que o login pare de funcionar.
        </p>
        <p style={baseTextStyle}>
          Para reabrir o banner de consentimento, limpe o cookie <code>atb_cookie_consent</code> nas
          configurações de privacidade do navegador.
        </p>

        <h2 style={h2Style}>Mudanças nesta política</h2>
        <p style={baseTextStyle}>
          Se mudarmos esta política, avisamos por banner no site. A data no topo desta página
          reflete a versão atual.
        </p>

        <h2 style={h2Style}>Contato</h2>
        <p style={baseTextStyle}>
          Dúvidas? Escreva para{" "}
          <a href={`mailto:${COMPANY.dpoEmail}`} style={{ color: "#e8b84b", textDecoration: "underline" }}>
            {COMPANY.dpoEmail}
          </a>
          {" "}ou veja nossa{" "}
          <Link href="/privacidade" style={{ color: "#e8b84b", textDecoration: "underline", fontWeight: 700 }}>
            Política de Privacidade
          </Link>.
        </p>
      </article>
    </main>
  );
}
