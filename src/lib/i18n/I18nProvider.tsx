"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type Locale, DEFAULT_LOCALE, detectLocale, saveLocale } from "./locales";
import { translate, type TKey } from "./dict";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey) => string;
  ready: boolean;
};

const I18nCtx = createContext<Ctx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (k) => translate(DEFAULT_LOCALE, k),
  ready: false,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setReady(true);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    saveLocale(l);
  };

  const t = (key: TKey) => translate(locale, key);

  return (
    <I18nCtx.Provider value={{ locale, setLocale, t, ready }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useT() {
  return useContext(I18nCtx);
}
