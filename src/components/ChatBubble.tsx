export function ChatBubble({
  role,
  content,
  typing,
  time,
  typingLabel,
  seenLabel,
}: {
  role: "user" | "assistant";
  content: string;
  typing?: boolean;
  /** Horário pré-formatado HH:MM (estilo app de mensagem). */
  time?: string;
  /** Rótulo "ATB está digitando…" mostrado junto dos pontinhos. */
  typingLabel?: string;
  /** "visto agora" — mostrado só na última mensagem do usuário (recibo de leitura). */
  seenLabel?: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-base mr-2 mt-1 flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}>
          🔮
        </div>
      )}
      <div
        className={`max-w-[80%] px-5 py-4 rounded-2xl text-base leading-relaxed whitespace-pre-wrap ${
          isUser ? "bubble-user rounded-br-sm" : "bubble-atb rounded-bl-sm"
        }`}
        style={{ fontSize: "1.05rem", lineHeight: "1.65" }}
      >
        {typing ? (
          <span className="inline-flex gap-2 items-center h-5">
            {typingLabel && (
              <span style={{ fontSize: "0.85rem", opacity: 0.75, fontStyle: "italic" }}>{typingLabel}</span>
            )}
            <span className="inline-flex gap-1 items-end">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          </span>
        ) : (
          <>
            {content}
            {time && (
              <span
                style={{
                  display: "block",
                  textAlign: "right",
                  fontSize: "0.7rem",
                  opacity: 0.6,
                  marginTop: 4,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {time}
                {isUser && (
                  <span style={{ color: "#7ee8f8", marginLeft: 4 }} aria-hidden="true">✓✓</span>
                )}
              </span>
            )}
          </>
        )}
      </div>
      {isUser && seenLabel && !typing && (
        <span style={{ alignSelf: "flex-end", fontSize: "0.7rem", color: "#7ee8f8", marginLeft: 6, marginBottom: 2 }}>
          {seenLabel}
        </span>
      )}
    </div>
  );
}
