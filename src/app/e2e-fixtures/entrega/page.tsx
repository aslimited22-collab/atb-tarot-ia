// Fixture E2E para a tela /entrega — só renderiza quando E2E_TEST=1.
// Em produção, retorna 404. Permite que o Playwright valide UX 60+
// sem precisar de pedido real no banco.

import { notFound } from "next/navigation";
import { EntregaClient } from "../../entrega/[orderId]/EntregaClient";

export const dynamic = "force-dynamic";

export default function EntregaE2EFixture() {
  // Guard duplo: bloqueia em produção mesmo se E2E_TEST=1 vazar por engano.
  if (process.env.VERCEL_ENV === "production") notFound();
  if (process.env.E2E_TEST !== "1") notFound();

  const fullJson = {
    title: "Sua Sessão Espírita Transformadora",
    opening:
      "Querida alma, hoje seu Espírito Mentor pediu para te dizer algo importante sobre o caminho que você está percorrendo. Respire fundo e deixe a mensagem te alcançar.",
    spiritual_reading:
      "As cargas que você sentiu nas últimas semanas vêm de fora — não são suas. Você absorveu o cansaço de pessoas próximas, e isso pesa no peito. Existe um pedido antigo do seu coração que ainda não foi atendido, e ele continua batendo, suave, esperando ser ouvido.",
    cleansing_message:
      "Imagine uma luz dourada lavando seu corpo de cima a baixo. Tudo que não é seu, ela leva. Faça esse exercício antes de dormir, por sete noites seguidas. A leveza vai chegar sem aviso.",
    protection_message:
      "Acenda uma vela branca na cozinha amanhã, ao amanhecer. Peça para São Miguel proteger sua casa, sua família e seu trabalho. Diga em voz alta o nome de cada pessoa que você ama.",
    next_steps: [
      "Beba mais água nos próximos três dias.",
      "Evite discussões antes de dormir.",
      "Anote cada sonho ao acordar — eles trazem respostas.",
    ],
    closing:
      "Você é mais forte do que imagina, e está sendo guiada com cuidado. Confie no tempo das coisas boas.",
    disclaimer:
      "Conteúdo espiritual, simbólico e reflexivo. Não substitui orientação médica, psicológica ou jurídica.",
  };

  return (
    <EntregaClient
      orderId="00000000-0000-0000-0000-e2e000000001"
      firstName="Maria"
      fullJson={fullJson}
      fullText={null}
      generationStatus="completed"
      whatsappUrl="https://wa.me/554998051700"
    />
  );
}
