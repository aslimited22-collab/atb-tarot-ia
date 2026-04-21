import Link from "next/link";

export function UpgradeLock({ required }: { required: "basic" | "premium" }) {
  return (
    <div className="card p-8 text-center max-w-lg mx-auto mt-10">
      <h2 className="serif text-3xl gold mb-3">Recurso bloqueado</h2>
      <p className="mb-6 text-white/80">
        Esta funcionalidade está disponível apenas para o plano{" "}
        <strong className="gold">{required === "premium" ? "Premium" : "Basic ou Premium"}</strong>.
      </p>
      <Link href="/#planos" className="btn-gold inline-block">Fazer Upgrade</Link>
    </div>
  );
}
