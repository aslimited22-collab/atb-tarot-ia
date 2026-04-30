"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

type Mode = "logged-purchased" | "logged-waiting" | "account-exists" | "needs-signup";

export default function ObrigadoLimpezaClient({ mode, email }: { mode: Mode; email: string }) {
  const router = useRouter();

  // Caso já esteja logado E tenha compra: redirect imediato pra sessão
  useEffect(() => {
    if (mode === "logged-purchased") {
      const t = setTimeout(() => {
        router.push("/dashboard/limpeza-espiritual");
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [mode, router]);

  // Caso logado e aguardando webhook: poll a cada 4s
  useEffect(() => {
    if (mode === "logged-waiting") {
      const t = setInterval(() => router.refresh(), 4000);
      return () => clearInterval(t);
    }
  }, [mode, router]);

  return (
    <main style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)",
      color: "#fbf8ff",
      padding: "20px 16px 40px",
    }}>
      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-10px); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease-out both; }
      `}</style>

      <div style={{ maxWidth: 580, width: "100%", margin: "0 auto", textAlign: "center" }}>
        {/* Imagem sagrada do altar — sempre presente */}
        <div className="fade-up" style={{
          borderRadius: 24,
          overflow: "hidden",
          marginBottom: 28,
          boxShadow: "0 25px 70px rgba(232,184,75,0.35), 0 0 0 3px rgba(232,184,75,0.5)",
        }}>
          <Image
            src="/img/limpeza-altar.png"
            alt="Altar sagrado da Limpeza Espiritual"
            width={1536}
            height={1024}
            priority
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>

        <div className="fade-up" style={{ animationDelay: "0.15s" }}>
          {mode === "logged-purchased" && <LoggedPurchased />}
          {mode === "logged-waiting" && <LoggedWaiting />}
          {mode === "account-exists" && <AccountExists email={email} />}
          {mode === "needs-signup" && <NeedsSignup initialEmail={email} />}
        </div>
      </div>
    </main>
  );
}

function LoggedPurchased() {
  return (
    <>
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s infinite" }}>✨</div>
      <h1 className="serif" style={{ fontSize: "clamp(2.2rem, 6vw, 3rem)", color: "#e8b84b", lineHeight: 1.1, marginBottom: 18, fontWeight: 700 }}>
        Sua Limpeza está pronta
      </h1>
      <p style={{ fontSize: "1.3rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 28, fontWeight: 500 }}>
        Os santos já estão te esperando, minha querida alma. Em poucos segundos você vai entrar na sua sessão sagrada com ATB.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 22 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%", background: "#e8b84b",
            animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <p style={{ fontSize: 15, color: "#c4b5fd", fontStyle: "italic" }}>
        🕊️ Que Nossa Senhora te cubra com seu manto sagrado
      </p>
    </>
  );
}

function LoggedWaiting() {
  return (
    <>
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s infinite" }}>🕊️</div>
      <h1 className="serif" style={{ fontSize: "clamp(2rem, 5.5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 16, fontWeight: 700 }}>
        Pagamento recebido!
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24, fontWeight: 500 }}>
        Estamos preparando sua <strong style={{ color: "#f5c860" }}>Limpeza Espiritual</strong>.
        <br />
        Aguarde um instantinho que ATB já vai te receber, minha querida alma.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%", background: "#e8b84b",
            animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <div style={{ background: "rgba(232,184,75,0.1)", border: "1px solid rgba(232,184,75,0.3)", borderRadius: 14, padding: "16px 18px", marginTop: 8 }}>
        <p style={{ fontSize: 15, color: "#fbf8ff", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
          Esta página vai abrir sozinha em alguns segundos.<br />
          Por favor, não feche.
        </p>
      </div>
    </>
  );
}

function AccountExists({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    setLoading(false);
    if (error) return toast.error("Email ou senha incorretos.");
    toast.success("Bem-vinda de volta!");
    router.push("/dashboard/limpeza-espiritual");
    router.refresh();
  }

  return (
    <>
      <div style={{ fontSize: 64, marginBottom: 14 }}>🌟</div>
      <h1 className="serif" style={{ fontSize: "clamp(2rem, 5.5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.1, marginBottom: 14, fontWeight: 700 }}>
        Sua compra foi confirmada
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 26, fontWeight: 500 }}>
        Você já tem uma conta com este email.<br />
        Faça login para entrar na sua Limpeza Sagrada.
      </p>

      <form onSubmit={handleLogin} className="card" style={{ padding: "32px 26px", textAlign: "left" }}>
        <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Seu email</label>
        <input className="input input-big" style={{ marginBottom: 22, opacity: 0.85 }} type="email" value={email} disabled />

        <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Sua senha</label>
        <div style={{ position: "relative", marginBottom: 24 }}>
          <input
            className="input input-big"
            type={showPwd ? "text" : "password"}
            placeholder="A senha que você cadastrou"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            autoComplete="current-password"
            style={{ paddingRight: 110 }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "rgba(232,184,75,0.15)", border: "1px solid rgba(232,184,75,0.4)",
              color: "#e8b84b", fontSize: 13, fontWeight: 700, padding: "10px 14px",
              borderRadius: 10, cursor: "pointer", minHeight: 0,
            }}
          >
            {showPwd ? "🙈" : "👁️"}
          </button>
        </div>

        <button
          disabled={loading || !password}
          className="btn-gold btn-big"
          style={{
            width: "100%",
            opacity: loading || !password ? 0.55 : 1,
            cursor: loading || !password ? "not-allowed" : "pointer",
            border: "none",
          }}
        >
          {loading ? "Entrando..." : "✨ Entrar e ver minha Limpeza"}
        </button>

        <p style={{ textAlign: "center", fontSize: 15, color: "#fbf8ff", marginTop: 22, lineHeight: 1.6 }}>
          Esqueceu a senha?{" "}
          <Link href="/login" style={{ color: "#e8b84b", fontWeight: 700, textDecoration: "underline" }}>
            Recuperar
          </Link>
        </p>
      </form>
    </>
  );
}

function NeedsSignup({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Senha deve ter no mínimo 8 letras ou números.");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      return toast.error(data.error || "Erro ao criar conta.");
    }

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    setLoading(false);

    if (loginError) {
      toast.success("Conta criada! Faça login.");
      router.push("/login");
      return;
    }

    toast.success("Pronto! Sua limpeza está liberada.");
    router.push("/dashboard/limpeza-espiritual");
    router.refresh();
  }

  return (
    <>
      <div style={{ fontSize: 64, marginBottom: 14 }}>🙏</div>
      <h1 className="serif" style={{ fontSize: "clamp(2.2rem, 6vw, 3rem)", color: "#e8b84b", lineHeight: 1.1, marginBottom: 14, fontWeight: 700 }}>
        Pagamento recebido!
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 22, fontWeight: 500 }}>
        Os santos te esperam, minha querida alma.<br />
        Crie sua conta agora para começar sua <strong style={{ color: "#f5c860" }}>Limpeza Sagrada</strong>.
      </p>

      <div style={{ background: "rgba(232,184,75,0.08)", border: "1px solid rgba(232,184,75,0.3)", borderRadius: 14, padding: "14px 18px", marginBottom: 22, textAlign: "left" }}>
        <p style={{ fontSize: 14, color: "#fbf8ff", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
          💡 Use o mesmo email que você usou na hora de pagar
        </p>
      </div>

      <form onSubmit={handleSignup} className="card" style={{ padding: "30px 26px", textAlign: "left" }}>
        <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Como posso te chamar?</label>
        <input
          className="input input-big"
          style={{ marginBottom: 20 }}
          type="text"
          placeholder="Seu primeiro nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={60}
          autoComplete="given-name"
        />

        <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Seu email da compra</label>
        <input
          className="input input-big"
          style={{ marginBottom: 20 }}
          type="email"
          placeholder="exemplo@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
        />

        <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Crie uma senha</label>
        <div style={{ position: "relative", marginBottom: 24 }}>
          <input
            className="input input-big"
            type={showPwd ? "text" : "password"}
            placeholder="Mínimo 8 letras ou números"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            style={{ paddingRight: 110 }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "rgba(232,184,75,0.15)", border: "1px solid rgba(232,184,75,0.4)",
              color: "#e8b84b", fontSize: 13, fontWeight: 700, padding: "10px 14px",
              borderRadius: 10, cursor: "pointer", minHeight: 0,
            }}
          >
            {showPwd ? "🙈" : "👁️"}
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
          }}
        >
          {loading ? "Criando..." : "✨ Começar minha Limpeza"}
        </button>

        <p style={{ textAlign: "center", fontSize: 15, color: "#fbf8ff", marginTop: 22, lineHeight: 1.6 }}>
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "#e8b84b", fontWeight: 700, textDecoration: "underline" }}>
            Fazer login
          </Link>
        </p>
      </form>
    </>
  );
}
