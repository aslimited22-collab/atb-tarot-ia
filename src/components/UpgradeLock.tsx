"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";

export function UpgradeLock({ required }: { required: "basic" | "premium" }) {
  const { t } = useT();
  const tier = required === "premium" ? t("lock.tier_premium") : t("lock.tier_basic_premium");
  return (
    <div className="card p-8 text-center max-w-lg mx-auto mt-10">
      <h2 className="serif text-3xl gold mb-3">{t("lock.h1")}</h2>
      <p className="mb-6 text-white/80">
        {t("lock.desc_part1")}{" "}
        <strong className="gold">{tier}</strong>.
      </p>
      <Link href="/#planos" className="btn-gold inline-block">{t("lock.upgrade_cta")}</Link>
    </div>
  );
}
