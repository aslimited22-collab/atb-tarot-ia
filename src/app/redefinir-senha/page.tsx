"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  // Supabase processa o `?code=...` automaticamente quando user chega via link de email
  // e cria uma sessão temporária. Verifica se está OK.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setValidSession(!!data.user);
    });
  }, []);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid || !passwordsMatch) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (error) {
        return toast.error(error.message || "Erro ao atualizar senha");
      }
      toast.success("Senha atualizada ✨");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      toast.error("Erro de rede");
    }
  }

  if (validSession === null) {
    return (
      <main style={{ background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ color: "#fbf8ff", fontSize: 19 }}>Carregando...</div>
      </main>
    );
  }

  if (!validSession) {
    return (
      <main style={{ background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div className="card" style={{ padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 72, marginBottom: 18 }} aria-hidden="true">⚠️</div>
            <h1 className="serif" style={{ fontSize: "1.8rem", color: "#fca5a5", marginBottom: 14, fontWeight: 700 }}>
              Link expirado ou inválido
            </h1>
            <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.65, fontWeight: 500, marginBottom: 26 }}>
              O link de recuperação pode ter expirado ou já foi usado. Solicite um novo abaixo.
            </p>
            <Link
              href="/esqueci-senha"
              className="btn-gold btn-big"
              style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: 19, fontWeight: 800, border: "none" }}
            >
              Solicitar novo link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 84, marginBottom: 16 }} aria-hidden="true">🔐</div>
          <h1 className="serif" style={{ fontSize: "clamp(2.4rem, 6vw, 3rem)", color: "#f5f0ff", lineHeight: 1.1, marginBottom: 12, fontWeight: 700 }}>
            Nova senha
          </h1>
          <p style={{ color: "#fbf8ff", fontSize: 21, lineHeight: 1.55, fontWeight: 500 }}>
            Crie uma nova senha segura. Mínimo 8 caracteres.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: "40px 32px" }}>
          <label htmlFor="password" style={{ display: "block", color: "#fbf8ff", fontSize: 21, fontWeight: 700, marginBottom: 10 }}>
            Nova senha
          </label>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              className="input input-big"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete="new-password"
              style={{ paddingRight: 80 }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              aria-label={showPwd ? "Esconder senha" : "Mostrar senha"}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(232,184,75,0.15)",
                border: "1px solid rgba(232,184,75,0.4)",
                color: "#e8b84b",
                fontSize: 22,
                width: 64,
                height: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>

          <label htmlFor="confirm" style={{ display: "block", color: "#fbf8ff", fontSize: 21, fontWeight: 700, marginBottom: 10 }}>
            Confirme a nova senha
          </label>
          <input
            id="confirm"
            type={showPwd ? "text" : "password"}
            className="input input-big"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Digite a senha de novo"
            required
            minLength={8}
            style={{ marginBottom: 8 }}
          />
          {confirmPassword && !passwordsMatch && (
            <p role="alert" style={{ color: "#ff8a8a", fontSize: 17, marginBottom: 12, marginTop: 4, fontWeight: 600 }}>
              <span aria-hidden="true">⚠️</span> As senhas não são iguais
            </p>
          )}

          <button
            disabled={loading || !passwordValid || !passwordsMatch}
            className="btn-gold btn-big"
            style={{
              width: "100%",
              opacity: loading || !passwordValid || !passwordsMatch ? 0.6 : 1,
              cursor: loading || !passwordValid || !passwordsMatch ? "not-allowed" : "pointer",
              border: "none",
              marginTop: 18,
            }}
          >
            {loading ? "Atualizando..." : "✨ Salvar nova senha"}
          </button>
        </form>
      </div>
    </main>
  );
}
