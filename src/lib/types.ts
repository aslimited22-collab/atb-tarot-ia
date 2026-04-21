export type Plan = "free" | "basic" | "premium";

export type UserRow = {
  id: string;
  email: string | null;
  plan: Plan;
  kiwify_order_id: string | null;
  messages_today: number;
  last_message_date: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
