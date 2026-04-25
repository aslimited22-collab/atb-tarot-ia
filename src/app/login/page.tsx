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
      // Mensagem genérica anti user-enumeration
      return toast.error("Email ou senha incorretos.");
    }
    toast.success("Bem-vindo(a) de volta.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 60, marginBottom: 8 }}>🔮</div>
          <h1 className="serif" style={{ fontSize: "2rem", color: "#f5f0ff" }}>ATB Tarot</h1>
          <p style={{ color: "#c4b5fd", fontSize: 16, marginTop: 4 }}>Entre na sua conta</p>
        </div>
        <form onSubmit={handleSubmit} className="card" style={{ padding: "32px 28px" }}>
          <label style={{ display: "block", color: "#c4b5fd", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Email</label>
          <input className="input" style={{ marginBottom: 20 }} type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label style={{ display: "block", color: "#c4b5fd", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Senha</label>
          <input className="input" style={{ marginBottom: 28 }} type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={loading} className="btn-gold w-full" style={{ padding: "16px", fontSize: "1.1rem" }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <p style={{ textAlign: "center", fontSize: 16, color: "#9575cd", marginTop: 18 }}>
            Não tem conta?{" "}
            <Link href="/cadastro" style={{ color: "#e8b84b", fontWeight: 700 }}>Cadastre-se</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
