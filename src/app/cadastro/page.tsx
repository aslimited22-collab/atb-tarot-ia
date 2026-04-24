"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Validação server-side (email, rate limit, domínios bloqueados)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Erro ao criar conta." }));
      setLoading(false);
      return toast.error(error || "Erro ao criar conta.");
    }

    // Login automático após signup
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (loginError) return toast.error("Conta criada! Faça login.");
    toast.success("Conta criada. Bem-vindo(a)!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 60, marginBottom: 8 }}>🔮</div>
          <h1 className="serif" style={{ fontSize: "2rem", color: "#f5f0ff" }}>ATB Tarot</h1>
          <p style={{ color: "#c4b5fd", fontSize: 16, marginTop: 4 }}>Crie sua conta gratuitamente</p>
        </div>
        <form onSubmit={handleSubmit} className="card" style={{ padding: "32px 28px" }}>
          <label style={{ display: "block", color: "#c4b5fd", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Seu nome</label>
          <input className="input" style={{ marginBottom: 20 }} type="text" placeholder="Como posso te chamar?" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          <label style={{ display: "block", color: "#c4b5fd", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Email</label>
          <input className="input" style={{ marginBottom: 20 }} type="email" placeholder="seu@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label style={{ display: "block", color: "#c4b5fd", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Senha</label>
          <input className="input" style={{ marginBottom: 28 }} type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          <button disabled={loading} className="btn-gold w-full" style={{ padding: "16px", fontSize: "1.1rem" }}>
            {loading ? "Criando..." : "Criar conta grátis"}
          </button>
          <p style={{ textAlign: "center", fontSize: 16, color: "#9575cd", marginTop: 18 }}>
            Já tem conta?{" "}
            <Link href="/login" style={{ color: "#e8b84b", fontWeight: 700 }}>Entrar</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
