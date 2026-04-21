"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada. Bem-vindo(a)!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="bg-mystic min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="card p-8 w-full max-w-md">
        <h1 className="serif text-3xl gold mb-6 text-center">Criar conta</h1>
        <input className="input mb-4" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input mb-6" type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        <button disabled={loading} className="btn-gold w-full mb-4">{loading ? "Criando..." : "Criar conta"}</button>
        <p className="text-center text-sm text-white/70">
          Já tem conta? <Link href="/login" className="gold">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
