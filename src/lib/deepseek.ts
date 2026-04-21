export const ATB_SYSTEM_PROMPT =
  "Você é ATB, uma tarologa mística e empática da plataforma ATB Tarot. Você oferece leituras de tarot, orientação sobre ansiedade, relacionamentos, vícios e autoconhecimento. Fale sempre em português brasileiro, com tom acolhedor, misterioso e direto. Use simbolismo do tarot nas suas respostas. Para temas de ansiedade e vícios, combine orientação espiritual com encorajamento gentil para buscar ajuda profissional quando necessário. Nunca faça diagnósticos médicos.";

const URL = "https://api.deepseek.com/v1/chat/completions";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function deepseekComplete(messages: Msg[]): Promise<string> {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({ model: "deepseek-chat", messages, stream: false }),
  });
  if (!res.ok) throw new Error(`DeepSeek: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function deepseekStream(messages: Msg[]): Promise<Response> {
  return fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({ model: "deepseek-chat", messages, stream: true }),
  });
}
