"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useT } from "@/lib/i18n/I18nProvider";

export default function PersonalMapForm({
  initialName,
}: {
  initialName?: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState(initialName || "");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Nome inválido");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return toast.error("Data inválida");
    setLoading(true);
    const res = await fetch("/api/numerology/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name.trim(), birth_date: birthDate }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast.error(d.error || "Erro ao salvar");
    }
    toast.success("Mapa revelado ✨");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "linear-gradient(135deg, rgba(232,184,75,0.10), rgba(232,184,75,0.04))",
        border: "2px dashed rgba(232,184,75,0.4)",
        borderRadius: 18,
        padding: "28px 24px",
        marginBottom: 24,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }} aria-hidden="true">🔮</div>
        <h2 className="serif" style={{ fontSize: "1.5rem", color: "#e8b84b", margin: 0, fontWeight: 700 }}>
          {t("numerology.personal_complete_h2")}
        </h2>
      </div>

      <label style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {t("numerology.personal_name_label")}
      </label>
      <input
        className="input input-big"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={100}
        autoComplete="name"
        style={{ marginBottom: 18 }}
      />

      <label style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {t("numerology.personal_birth_label")}
      </label>
      <input
        className="input input-big"
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        required
        max={new Date().toISOString().slice(0, 10)}
        min="1900-01-01"
        style={{ marginBottom: 22 }}
      />

      <button
        type="submit"
        disabled={loading}
        className="btn-gold btn-big"
        style={{ width: "100%", border: "none", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "..." : t("numerology.personal_save")}
      </button>
    </form>
  );
}
