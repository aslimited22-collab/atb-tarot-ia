export function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl whitespace-pre-wrap ${
          isUser
            ? "bg-gold text-[#1a0030] rounded-br-sm"
            : "bg-purple/30 border border-gold/30 rounded-bl-sm"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
