import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";

export const metadata = {
  title: "Política de Privacidade — ATB",
  description: "Como tratamos seus dados pessoais conforme a LGPD.",
};

const COMPANY = {
  name: "AS LIMITED",
  cnpj: "41.943.844/0001-53",
  address: "Rua Curitiba, 179E — Centro, Chapecó/SC",
  dpoEmail: "aslimited22@gmail.com",
  contact: "aslimited22@gmail.com",
};

const baseTextStyle = { fontSize: 19, lineHeight: 1.75, color: "#fbf8ff", fontWeight: 500 } as const;
const h2Style = { fontSize: "1.6rem", color: "#e8b84b", marginTop: 36, marginBottom: 14, fontWeight: 700 } as const;
const h3Style = { fontSize: "1.25rem", color: "#f5c860", marginTop: 24, marginBottom: 10, fontWeight: 700 } as const;
const liStyle = { ...baseTextStyle, marginBottom: 10 } as const;

export default function PrivacidadePage() {
  const { t } = getServerT();
  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <main style={{ background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", minHeight: "100vh", color: "#fbf8ff", padding: "48px 20px 80px" }}>
      <article style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-block", color: "#c4b5fd", fontSize: 18, fontWeight: 600, textDecoration: "none", marginBottom: 24, padding: "10px 14px", minHeight: 44 }}>
          ← {t("v2.back")}
        </Link>

        <h1 className="serif" style={{ fontSize: "clamp(2.4rem, 6vw, 3.4rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 18, fontWeight: 700 }}>
          Política de Privacidade
        </h1>
        <p style={{ fontSize: 17, color: "#c4b5fd", marginBottom: 36, fontWeight: 500 }}>
          Última atualização: {today}
        </p>

        <p style={baseTextStyle}>
          A sua privacidade é importante para nós. Esta política explica, em linguagem simples,
          quais dados pessoais coletamos quando você usa a ATB, para que servem e quais são os seus direitos.
          Estamos em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>.
        </p>

        <h2 style={h2Style}>1. Quem somos</h2>
        <p style={baseTextStyle}>
          O serviço ATB é operado por <strong>{COMPANY.name}</strong>, inscrita no CNPJ sob o nº{" "}
          <strong>{COMPANY.cnpj}</strong>, com sede em {COMPANY.address}. Somos o <strong>controlador</strong> dos
          seus dados pessoais conforme a LGPD.
        </p>
        <p style={baseTextStyle}>
          <strong>Encarregado de Dados (DPO):</strong>{" "}
          <a href={`mailto:${COMPANY.dpoEmail}`} style={{ color: "#e8b84b", textDecoration: "underline" }}>
            {COMPANY.dpoEmail}
          </a>
        </p>

        <h2 style={h2Style}>2. Quais dados coletamos</h2>
        <h3 style={h3Style}>2.1. Dados que você nos fornece</h3>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}><strong>Cadastro:</strong> nome, e-mail, senha (criptografada).</li>
          <li style={liStyle}><strong>Conversas com ATB:</strong> mensagens que você envia no chat, oráculo, diário e guia espiritual.</li>
          <li style={liStyle}><strong>Limpeza Espiritual:</strong> sentimentos, situação atual, signo, data de nascimento (se você optar por informar).</li>
          <li style={liStyle}><strong>Sessão Vídeo Chamada:</strong> nome, telefone/WhatsApp (para agendamento).</li>
        </ul>

        <h3 style={h3Style}>2.2. Dados coletados automaticamente</h3>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}><strong>Cookies de autenticação</strong> (essenciais — você precisa pra fazer login).</li>
          <li style={liStyle}><strong>Idioma preferido</strong> (cookie funcional, não-identificável).</li>
          <li style={liStyle}><strong>Endereço IP e User-Agent</strong> (para segurança e prevenção de fraude).</li>
        </ul>

        <h3 style={h3Style}>2.3. Dados de pagamento</h3>
        <p style={baseTextStyle}>
          Não armazenamos números de cartão de crédito. Pagamentos são processados pelos parceiros{" "}
          <strong>Kiwify</strong> e <strong>Stripe</strong>, que recebem seus dados de pagamento diretamente
          (criptografados em trânsito e em repouso). Recebemos apenas o status da transação e seu e-mail.
        </p>

        <h2 style={h2Style}>3. Para que usamos seus dados</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}><strong>Prestação do serviço:</strong> autenticar você, entregar leituras e conversas, processar pagamentos.</li>
          <li style={liStyle}><strong>Comunicação:</strong> enviar confirmações de pagamento, lembretes, suporte por e-mail e WhatsApp (apenas se você forneceu o número).</li>
          <li style={liStyle}><strong>Segurança:</strong> detectar e prevenir fraudes, ataques e uso indevido.</li>
          <li style={liStyle}><strong>Obrigações legais:</strong> retenção de registros fiscais (cumprimento do Marco Civil da Internet e legislação fiscal).</li>
        </ul>

        <h2 style={h2Style}>4. Com quem compartilhamos</h2>
        <p style={baseTextStyle}>
          Compartilhamos dados estritamente necessários com os seguintes processadores, todos com cláusulas de proteção de dados:
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}><strong>Supabase</strong> (Estados Unidos) — armazenamento de banco de dados e autenticação.</li>
          <li style={liStyle}><strong>Vercel</strong> (Estados Unidos) — hospedagem do site.</li>
          <li style={liStyle}><strong>Kiwify / Stripe</strong> (Brasil / EUA) — processamento de pagamentos.</li>
          <li style={liStyle}><strong>DeepSeek / OpenAI</strong> (Estados Unidos) — geração das respostas espirituais (apenas o conteúdo que você envia no chat é processado, sem seu e-mail).</li>
          <li style={liStyle}><strong>Resend</strong> (Estados Unidos) — envio de e-mails transacionais.</li>
          <li style={liStyle}><strong>Z-API</strong> (Brasil) — envio de mensagens via WhatsApp (somente se você forneceu telefone).</li>
        </ul>
        <p style={baseTextStyle}>
          <strong>Não vendemos seus dados</strong> a anunciantes nem terceiros. Não usamos seus dados para
          publicidade comportamental.
        </p>

        <h2 style={h2Style}>5. Por quanto tempo guardamos</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}><strong>Dados de conta:</strong> enquanto sua conta estiver ativa. Após exclusão, removemos em até 30 dias.</li>
          <li style={liStyle}><strong>Conversas e leituras:</strong> enquanto sua conta estiver ativa.</li>
          <li style={liStyle}><strong>Registros de pagamento:</strong> 5 anos, por obrigação fiscal (Receita Federal). Após exclusão da conta, anonimizamos esses registros (removemos nome e e-mail, mantemos apenas o ID interno e o valor).</li>
          <li style={liStyle}><strong>Logs de segurança:</strong> 90 dias.</li>
        </ul>

        <h2 style={h2Style}>6. Seus direitos (LGPD)</h2>
        <p style={baseTextStyle}>Você pode, a qualquer momento:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}><strong>Acessar</strong> os dados que temos sobre você.</li>
          <li style={liStyle}><strong>Corrigir</strong> dados desatualizados ou incorretos.</li>
          <li style={liStyle}><strong>Excluir</strong> sua conta e dados (com ressalva dos registros fiscais).</li>
          <li style={liStyle}><strong>Portar</strong> seus dados (exportar em formato legível).</li>
          <li style={liStyle}><strong>Opor-se</strong> a tratamentos específicos.</li>
          <li style={liStyle}><strong>Revogar consentimento</strong> a qualquer momento.</li>
        </ul>
        <p style={baseTextStyle}>
          Para exercer estes direitos, acesse{" "}
          <Link href="/dashboard/privacidade" style={{ color: "#e8b84b", textDecoration: "underline", fontWeight: 700 }}>
            seu painel de privacidade
          </Link>{" "}
          (após login) ou escreva para{" "}
          <a href={`mailto:${COMPANY.dpoEmail}`} style={{ color: "#e8b84b", textDecoration: "underline" }}>
            {COMPANY.dpoEmail}
          </a>.
          Respondemos em até 15 dias úteis.
        </p>

        <h2 style={h2Style}>7. Segurança técnica</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}>Todo o tráfego é protegido por <strong>HTTPS/TLS 1.3</strong>.</li>
          <li style={liStyle}>Senhas são armazenadas com <strong>hash criptográfico</strong> (bcrypt via Supabase Auth).</li>
          <li style={liStyle}>Banco de dados com <strong>Row Level Security (RLS)</strong> — cada usuário só acessa seus próprios dados.</li>
          <li style={liStyle}>Logs estruturados com <strong>mascaramento automático de PII</strong>.</li>
          <li style={liStyle}>Webhooks verificados por <strong>assinatura HMAC</strong>.</li>
          <li style={liStyle}>Rate limiting para prevenir abuso e brute-force.</li>
        </ul>

        <h2 style={h2Style}>8. Crianças e adolescentes</h2>
        <p style={baseTextStyle}>
          Este serviço é destinado a pessoas com 18 anos ou mais. Não coletamos dados de menores
          intencionalmente. Se você é responsável por um menor que tenha criado conta, entre em contato
          para exclusão imediata.
        </p>

        <h2 style={h2Style}>9. Mudanças nesta política</h2>
        <p style={baseTextStyle}>
          Podemos atualizar esta política. Mudanças relevantes serão comunicadas por e-mail e
          banner no site. A data de "última atualização" no topo desta página reflete a versão atual.
        </p>

        <h2 style={h2Style}>10. Contato</h2>
        <p style={baseTextStyle}>
          Dúvidas? Escreva para{" "}
          <a href={`mailto:${COMPANY.contact}`} style={{ color: "#e8b84b", textDecoration: "underline" }}>
            {COMPANY.contact}
          </a>{" "}
          ou consulte nosso{" "}
          <Link href="/termos" style={{ color: "#e8b84b", textDecoration: "underline" }}>Termos de Uso</Link>{" "}
          e{" "}
          <Link href="/cookies" style={{ color: "#e8b84b", textDecoration: "underline" }}>Política de Cookies</Link>.
        </p>

        <p style={{ ...baseTextStyle, fontSize: 16, color: "#9575cd", marginTop: 48, fontStyle: "italic" }}>
          Você também pode registrar reclamações junto à <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>:{" "}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" style={{ color: "#c4b5fd" }}>
            www.gov.br/anpd
          </a>.
        </p>
      </article>
    </main>
  );
}
