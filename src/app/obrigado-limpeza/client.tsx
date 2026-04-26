"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      }, 2000);
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
      color: "#f5f0ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>

      <div style={{ maxWidth: 540, width: "100%", textAlign: "center" }}>
        {mode === "logged-purchased" && <LoggedPurchased />}
        {mode === "logged-waiting" && <LoggedWaiting />}
        {mode === "account-exists" && <AccountExists email={email} />}
        {mode === "needs-signup" && <NeedsSignup initialEmail={email} />}
      </div>
    </main>
  );
}

function LoggedPurchased() {
  return (
    <>
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s infinite" }}>✨</div>
      <h1 className="serif" style={{ fontSize: "2.4rem", color: "#e8b84b", lineHeight: 1.15, marginBottom: 16 }}>
        Sua limpeza está pronta!
      </h1>
      <p style={{ fontSize: "1.15rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24 }}>
        Em alguns segundos você vai entrar na sua sessão sagrada com ATB.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: "50%", background: "#e8b84b",
            animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </>
  );
}

function LoggedWaiting() {
  return (
    <>
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s infinite" }}>🕊️</div>
      <h1 className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", lineHeight: 1.2, marginBottom: 14 }}>
        Pagamento recebido!
      </h1>
      <p style={{ fontSize: "1.1rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 22 }}>
        Estamos preparando sua <strong style={{ color: "#f5c860" }}>Limpeza Espiritual</strong>.
        <br />
        Aguarde só um instantinho que ATB já vai te receber.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: "50%", background: "#e8b84b",
            animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <p style={{ fontSize: 13, color: "#9575cd", lineHeight: 1.6 }}>
        Esta página vai abrir sozinha. Por favor, não feche.
      </p>
    </>
  );
}

function AccountExists({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
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
      <div style={{ fontSize: 60, marginBottom: 14 }}>🌟</div>
      <h1 className="serif" style={{ fontSize: "2rem", color: "#e8b84b", lineHeight: 1.2, marginBottom: 12 }}>
        Compra confirmada!
      </h1>
      <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24 }}>
        Você já tem uma conta no ATB Tarot com este email.
        <br />
        Faça login para acessar sua Limpeza:
      </p>

      <form onSubmit={handleLogin} className="card" style={{ padding: "26px 22px", textAlign: "left" }}>
        <label style={{ display: "block", color: "#c4b5fd", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email</label>
        <input className="input" style={{ marginBottom: 16 }} type="email" value={email} disabled />

        <label style={{ display: "block", color: "#c4b5fd", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Senha</label>
        <input
          className="input"
          style={{ marginBottom: 22 }}
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />

        <button disabled={loading || !password} className="btn-gold w-full" style={{ padding: "14px", fontSize: "1.05rem" }}>
          {loading ? "Entrando..." : "Entrar e ver minha Limpeza"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "#9575cd", marginTop: 14 }}>
          Esqueceu a senha?{" "}
          <Link href="/login" style={{ color: "#e8b84b", fontWeight: 600 }}>
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
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Senha deve ter no mínimo 8 caracteres.");
    setLoading(true);

    // Cria conta
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

    // Faz login automaticamente
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
      <div style={{ fontSize: 60, marginBottom: 14 }}>🙏</div>
      <h1 className="serif" style={{ fontSize: "2rem", color: "#e8b84b", lineHeight: 1.2, marginBottom: 12 }}>
        Pagamento recebido!
      </h1>
      <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 22 }}>
        Crie sua conta agora para acessar sua <strong style={{ color: "#f5c860" }}>Limpeza Espiritual</strong>.
        Use o mesmo email que você usou na compra.
      </p>

      <form onSubmit={handleSignup} className="card" style={{ padding: "26px 22px", textAlign: "left" }}>
        <label style={{ display: "block", color: "#c4b5fd", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Seu nome</label>
        <input
          className="input"
          style={{ marginBottom: 14 }}
          type="text"
          placeholder="Como posso te chamar?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={60}
        />

        <label style={{ display: "block", color: "#c4b5fd", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email da compra</label>
        <input
          className="input"
          style={{ marginBottom: 14 }}
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label style={{ display: "block", color: "#c4b5fd", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Crie uma senha</label>
        <input
          className="input"
          style={{ marginBottom: 22 }}
          type="password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <button disabled={loading} className="btn-gold w-full" style={{ padding: "14px", fontSize: "1.05rem" }}>
          {loading ? "Criando..." : "Criar conta e ver minha Limpeza"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "#9575cd", marginTop: 14 }}>
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "#e8b84b", fontWeight: 600 }}>
            Fazer login
          </Link>
        </p>
      </form>
    </>
  );
}
