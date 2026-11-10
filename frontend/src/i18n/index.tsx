import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en, { type Messages } from "./en";
import es from "./es";
import fr from "./fr";
import hi from "./hi";
import pt from "./pt";
import de from "./de";
import zh from "./zh";
import bn from "./bn";
import ar from "./ar";

export const LANGUAGES = { en: "English", hi: "हिन्दी", bn: "বাংলা", es: "Español", fr: "Français", pt: "Português", de: "Deutsch", ar: "العربية", zh: "中文" } as const;
const RTL: Lang[] = ["ar"];
export type Lang = keyof typeof LANGUAGES;
const DICTS: Record<Lang, Partial<Messages>> = { en, hi, bn, es, fr, pt, de, ar, zh };

interface I18n {
  lang: Lang;
  setLang(l: Lang): void;
  t(key: keyof Messages): string;
}
const Ctx = createContext<I18n>(null as unknown as I18n);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("cn_lang") as Lang | null;
    if (saved && saved in LANGUAGES) return saved;
  } catch { /* storage unavailable */ }
  const nav = navigator.language?.slice(0, 2) as Lang;
  return nav in LANGUAGES ? nav : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = RTL.includes(lang) ? "rtl" : "ltr"; }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("cn_lang", l); } catch { /* ignore */ }
  }, []);
  const value = useMemo<I18n>(() => ({ lang, setLang, t: (k) => DICTS[lang][k] ?? en[k] ?? String(k) }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
export type { Messages };
