"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/Skeleton";
import { BackButton } from "@/components/BackButton";
import { useT } from "@/lib/i18n/I18nProvider";

type Entry = { id: string; user_input: string; ai_response: string; created_at: string };

const LOCALE_BY_KEY: Record<string, string> = {
  pt: "pt-BR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT", ja: "ja-JP",
};

export function JournalClient() {
  const { t, locale } = useT();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/journal")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => toast.error(t("journal.toast_load_error")))
      .finally(() => setLoading(false));
  }, [t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("journal.toast_error"));
      } else {
        setEntries((e) => [data.entry, ...e]);
        setInput("");
        toast.success(t("journal.toast_saved"));
      }
    } catch {
      toast.error(t("journal.toast_network"));
    } finally {
      setSending(false);
    }
  }

  const dateFormatter = LOCALE_BY_KEY[locale] || "en-US";

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <BackButton />
      <h1 className="serif text-3xl md:text-4xl gold mb-2">{t("journal.h1")}</h1>
      <p className="text-white/70 mb-6">{t("journal.subtitle")}</p>

      <form onSubmit={submit} className="card p-6 mb-8">
        <textarea
          className="input min-h-[140px] mb-4"
          placeholder={t("journal.placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button className="btn-gold" disabled={sending || !input.trim()}>
          {sending ? t("journal.sending") : t("journal.cta")}
        </button>
      </form>

      <h2 className="serif text-2xl gold mb-4">{t("journal.entries_h2")}</h2>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-white/60">{t("journal.empty")}</p>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <div key={e.id} className="card p-5">
              <div className="text-xs text-white/50 mb-2">{new Date(e.created_at).toLocaleString(dateFormatter)}</div>
              <div className="text-sm text-white/70 mb-3 italic">
                "{e.user_input.length > 120 ? e.user_input.slice(0, 120) + "..." : e.user_input}"
              </div>
              <div className="text-white/90 whitespace-pre-wrap">{e.ai_response}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
