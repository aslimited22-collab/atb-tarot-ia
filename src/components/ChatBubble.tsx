export function ChatBubble({
  role,
  content,
  typing,
}: {
  role: "user" | "assistant";
  content: string;
  typing?: boolean;
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
          <span className="inline-flex gap-1 items-end h-5">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </span>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
