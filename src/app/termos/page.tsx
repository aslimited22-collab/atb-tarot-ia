import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";

export const metadata = {
  title: "Termos de Uso — ATB",
  description: "Regras de uso do serviço ATB.",
};

const COMPANY = {
  name: "AS LIMITED",
  cnpj: "41.943.844/0001-53",
  address: "Rua Curitiba, 179E — Centro, Chapecó/SC",
  contact: "aslimited22@gmail.com",
  city: "Chapecó",
  uf: "SC",
};

const baseTextStyle = { fontSize: 19, lineHeight: 1.75, color: "#fbf8ff", fontWeight: 500 } as const;
const h2Style = { fontSize: "1.6rem", color: "#e8b84b", marginTop: 36, marginBottom: 14, fontWeight: 700 } as const;
const liStyle = { ...baseTextStyle, marginBottom: 10 } as const;

export default function TermosPage() {
  const { t } = getServerT();
  const today = new Date().toLocaleDateString("pt-BR");

  return (
    <main style={{ background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", minHeight: "100vh", color: "#fbf8ff", padding: "48px 20px 80px" }}>
      <article style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-block", color: "#c4b5fd", fontSize: 18, fontWeight: 600, textDecoration: "none", marginBottom: 24, padding: "10px 14px", minHeight: 44 }}>
          ← {t("v2.back")}
        </Link>

        <h1 className="serif" style={{ fontSize: "clamp(2.4rem, 6vw, 3.4rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 18, fontWeight: 700 }}>
          Termos de Uso
        </h1>
        <p style={{ fontSize: 17, color: "#c4b5fd", marginBottom: 36, fontWeight: 500 }}>
          Última atualização: {today}
        </p>

        <p style={baseTextStyle}>
          Ao usar o serviço ATB você concorda com estes Termos. Leia com calma. Se não concordar,
          por favor não use o serviço.
        </p>

        <h2 style={h2Style}>1. O que é a ATB</h2>
        <p style={baseTextStyle}>
          A ATB é uma plataforma de <strong>orientação espiritual com inteligência artificial</strong>,
          oferecendo chat, oráculo diário, diário da ansiedade e guia de vícios. Também vendemos
          o produto pontual <strong>Limpeza Espiritual Personalizada</strong> e a <strong>Sessão Vídeo Chamada</strong> ao vivo.
        </p>
        <p style={baseTextStyle}>
          <strong>Importante:</strong> a ATB é um serviço de bem-estar espiritual. Não substitui
          atendimento médico, psicológico ou jurídico. Se você está em sofrimento intenso, procure
          ajuda profissional. Em emergências, ligue 188 (CVV) ou 192 (SAMU).
        </p>

        <h2 style={h2Style}>2. Cadastro e conta</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}>Você deve ter <strong>18 anos ou mais</strong> para criar conta.</li>
          <li style={liStyle}>Os dados que você fornecer no cadastro devem ser <strong>verdadeiros</strong>.</li>
          <li style={liStyle}>Você é responsável por manter sua senha em segredo. Não compartilhe seu login.</li>
          <li style={liStyle}>Suspeita de uso não autorizado? Troque a senha em "Esqueci minha senha" e nos avise.</li>
        </ul>

        <h2 style={h2Style}>3. Planos e cobrança</h2>
        <p style={baseTextStyle}>
          Oferecemos dois planos pagos mensais:
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}><strong>Basic — R$ 29/mês</strong>: 30 mensagens no chat por mês, oráculo diário, diário da ansiedade.</li>
          <li style={liStyle}><strong>Consulta Completa — R$ 250/mês</strong>: converse com ATB sobre qualquer assunto, tratamento espiritual para vícios/ansiedade e numerologia da sorte completa.</li>
        </ul>
        <p style={baseTextStyle}>
          A cobrança é <strong>recorrente</strong> (renovação automática mensal) processada pela{" "}
          <strong>Kiwify</strong> ou <strong>Stripe</strong>. Você pode <strong>cancelar a qualquer momento</strong>{" "}
          sem multa ou fidelidade. O acesso continua até o fim do período já pago.
        </p>

        <h3 style={{ fontSize: "1.25rem", color: "#f5c860", marginTop: 24, marginBottom: 10, fontWeight: 700 }}>3.1. Produtos avulsos</h3>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}><strong>Limpeza Espiritual — R$ 100</strong>: pagamento único, entrega imediata via e-mail/WhatsApp.</li>
          <li style={liStyle}><strong>Sessão Vídeo Chamada — R$ 497</strong>: agendamento via WhatsApp após pagamento.</li>
        </ul>

        <h2 style={h2Style}>4. Cancelamento</h2>
        <p style={baseTextStyle}>
          Você pode cancelar qualquer plano mensal a qualquer momento:
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}>No painel da Kiwify (link enviado no e-mail de confirmação)</li>
          <li style={liStyle}>Escrevendo para <a href={`mailto:${COMPANY.contact}`} style={{ color: "#e8b84b", textDecoration: "underline" }}>{COMPANY.contact}</a></li>
        </ul>
        <p style={baseTextStyle}>
          O cancelamento <strong>não gera estorno automático</strong> de cobranças já realizadas — você usa
          o serviço até o fim do período. Veja a seção 5 sobre reembolso.
        </p>

        <h2 style={h2Style}>5. Reembolso (Direito de Arrependimento)</h2>
        <p style={baseTextStyle}>
          Conforme o <strong>Código de Defesa do Consumidor (Art. 49)</strong>, você tem{" "}
          <strong>7 dias corridos</strong> após a compra para solicitar reembolso integral, sem precisar
          justificar. Basta enviar e-mail para{" "}
          <a href={`mailto:${COMPANY.contact}`} style={{ color: "#e8b84b", textDecoration: "underline" }}>{COMPANY.contact}</a>{" "}
          com seu pedido. Processamos em até 7 dias úteis.
        </p>

        <h2 style={h2Style}>6. Uso permitido</h2>
        <p style={baseTextStyle}>Você concorda em <strong>NÃO</strong>:</p>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}>Usar o serviço para atividades ilegais.</li>
          <li style={liStyle}>Tentar hackear, burlar limites de uso ou copiar a plataforma.</li>
          <li style={liStyle}>Compartilhar conteúdo ofensivo, discriminatório ou que viole direitos de terceiros.</li>
          <li style={liStyle}>Automatizar requisições (bots, scripts) sem autorização.</li>
          <li style={liStyle}>Revender ou redistribuir o serviço sem nosso consentimento.</li>
        </ul>
        <p style={baseTextStyle}>
          Violações podem resultar em <strong>suspensão imediata</strong> da conta, sem reembolso, e em
          medidas legais cabíveis.
        </p>

        <h2 style={h2Style}>7. Propriedade intelectual</h2>
        <p style={baseTextStyle}>
          Todo o conteúdo da ATB (textos, imagens, layout, código-fonte, marca) é{" "}
          <strong>propriedade de {COMPANY.name}</strong>. As leituras e textos gerados pra você são
          de uso pessoal — você pode imprimir, compartilhar com amigos, mas não pode revender.
        </p>

        <h2 style={h2Style}>8. Isenção de garantias</h2>
        <p style={baseTextStyle}>
          A ATB é oferecida "como está". <strong>Não garantimos resultados específicos</strong> nas suas
          questões pessoais — espiritualidade é experiência individual. Não substituímos:
        </p>
        <ul style={{ paddingLeft: 24 }}>
          <li style={liStyle}>Atendimento médico (incluindo psicológico/psiquiátrico)</li>
          <li style={liStyle}>Aconselhamento jurídico</li>
          <li style={liStyle}>Aconselhamento financeiro</li>
          <li style={liStyle}>Aconselhamento religioso institucional</li>
        </ul>

        <h2 style={h2Style}>9. Limitação de responsabilidade</h2>
        <p style={baseTextStyle}>
          Dentro dos limites permitidos pela lei brasileira, nossa responsabilidade total por qualquer
          dano decorrente do uso do serviço fica limitada ao <strong>valor pago por você nos últimos 12 meses</strong>.
          Não respondemos por danos indiretos (lucros cessantes, danos morais alheios às nossas obrigações).
        </p>

        <h2 style={h2Style}>10. Mudanças nos Termos</h2>
        <p style={baseTextStyle}>
          Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas por e-mail e banner no site.
          Se você continuar usando após a comunicação, considera-se que concordou com a nova versão.
        </p>

        <h2 style={h2Style}>11. Foro</h2>
        <p style={baseTextStyle}>
          Estes Termos são regidos pela <strong>lei brasileira</strong>. Fica eleito o foro da Comarca de{" "}
          <strong>{COMPANY.city}/{COMPANY.uf}</strong> para dirimir quaisquer controvérsias, com renúncia
          a qualquer outro, por mais privilegiado que seja.
        </p>

        <h2 style={h2Style}>12. Contato</h2>
        <p style={baseTextStyle}>
          {COMPANY.name} — CNPJ {COMPANY.cnpj}
          <br />
          {COMPANY.address}
          <br />
          E-mail:{" "}
          <a href={`mailto:${COMPANY.contact}`} style={{ color: "#e8b84b", textDecoration: "underline" }}>
            {COMPANY.contact}
          </a>
        </p>
      </article>
    </main>
  );
}
