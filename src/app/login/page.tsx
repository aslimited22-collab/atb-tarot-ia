"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    setLoading(false);
    if (error) {
      return toast.error("Email ou senha incorretos. Tente de novo.");
    }
    toast.success("Bem-vinda de volta!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{
      background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo + título */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 80, marginBottom: 14 }}>🔮</div>
          <h1 className="serif" style={{ fontSize: "2.8rem", color: "#f5f0ff", lineHeight: 1.1, marginBottom: 10 }}>
            ATB
          </h1>
          <p style={{ color: "#fbf8ff", fontSize: 19, lineHeight: 1.5 }}>
            Bem-vinda de volta, minha querida alma 💛
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="card" style={{ padding: "36px 32px" }}>
          <h2 className="serif" style={{ fontSize: "1.7rem", color: "#e8b84b", marginBottom: 24, textAlign: "center" }}>
            Entrar na sua conta
          </h2>

          {/* Email */}
          <label htmlFor="email" style={{ display: "block", color: "#fbf8ff", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
            Seu email
          </label>
          <input
            id="email"
            className="input input-big"
            type="email"
            placeholder="exemplo@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            style={{ marginBottom: 24 }}
          />

          {/* Senha */}
          <label htmlFor="password" style={{ display: "block", color: "#fbf8ff", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
            Sua senha
          </label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input
              id="password"
              className="input input-big"
              type={showPwd ? "text" : "password"}
              placeholder="A senha que você cadastrou"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ paddingRight: 110 }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(232,184,75,0.15)",
                border: "1px solid rgba(232,184,75,0.4)",
                color: "#e8b84b",
                fontSize: 14,
                fontWeight: 700,
                padding: "10px 14px",
                borderRadius: 10,
                cursor: "pointer",
                minHeight: 0,
              }}
            >
              {showPwd ? "🙈 Ocultar" : "👁️ Mostrar"}
            </button>
          </div>

          <button
            disabled={loading}
            className="btn-gold btn-big"
            style={{
              width: "100%",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              border: "none",
              marginTop: 16,
              marginBottom: 24,
            }}
          >
            {loading ? "Entrando..." : "✨ Entrar"}
          </button>

          {/* Link cadastro */}
          <div style={{ textAlign: "center", padding: "16px 0", borderTop: "1px solid rgba(196,181,253,0.18)" }}>
            <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
              Ainda não tem conta?<br />
              <Link href="/cadastro" style={{ color: "#e8b84b", fontWeight: 700, fontSize: 19, textDecoration: "underline", display: "inline-block", marginTop: 8, padding: "8px 16px" }}>
                ✨ Criar minha conta agora
              </Link>
            </p>
          </div>
        </form>

        {/* Voltar para landing */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ color: "#c4b5fd", fontSize: 16, textDecoration: "none", padding: "8px 16px" }}>
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </main>
  );
}
