"use client";
import { useState, useRef, useEffect } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";

export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LOCALE_LABELS[locale];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(196,181,253,0.22)",
          color: "#f5f0ff",
          borderRadius: 999,
          padding: compact ? "6px 12px" : "8px 14px",
          fontSize: compact ? 13 : 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 600,
        }}
        aria-label="Language selector"
      >
        <span style={{ fontSize: compact ? 14 : 16 }}>{current.flag}</span>
        <span>{current.name}</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "#1e0040",
            border: "1px solid rgba(196,181,253,0.3)",
            borderRadius: 12,
            minWidth: 180,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {LOCALES.map((l: Locale) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              style={{
                width: "100%",
                background: l === locale ? "rgba(232,184,75,0.15)" : "transparent",
                border: "none",
                color: "#f5f0ff",
                padding: "10px 14px",
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                fontWeight: l === locale ? 700 : 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(232,184,75,0.12)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = l === locale ? "rgba(232,184,75,0.15)" : "transparent")
              }
            >
              <span style={{ fontSize: 18 }}>{LOCALE_LABELS[l].flag}</span>
              <span>{LOCALE_LABELS[l].name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
