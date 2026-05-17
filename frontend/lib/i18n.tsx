"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import koMessages from "@/messages/ko.json";
import enMessages from "@/messages/en.json";

export const locales = ["ko", "en"] as const;
export type Locale = (typeof locales)[number];

const messages = {
  ko: koMessages,
  en: enMessages,
};

type MessageMap = typeof koMessages;
type TranslationValues = Record<string, string | number>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const localeChangeEvent = "geumbang:locale-change";

export function isLocale(value?: string): value is Locale {
  return locales.includes(value as Locale);
}

function getPathLocale(pathname: string): Locale | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return isLocale(firstSegment) ? firstSegment : null;
}

function readMessage(source: MessageMap, key: string) {
  return key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, source);
}

function formatMessage(template: string, values?: TranslationValues) {
  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    values[name] == null ? `{${name}}` : String(values[name]),
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");

  useEffect(() => {
    const pathLocale = getPathLocale(window.location.pathname);
    const storedLocale = window.localStorage.getItem("locale");
    const storedCandidate = storedLocale ?? undefined;
    const nextLocale: Locale =
      pathLocale ?? (isLocale(storedCandidate) ? storedCandidate : "ko");

    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem("locale", nextLocale);
    document.documentElement.lang = nextLocale;
    window.dispatchEvent(new CustomEvent(localeChangeEvent, { detail: nextLocale }));
  }, []);

  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      const translated = readMessage(messages[locale], key);
      const fallback = readMessage(messages.ko, key);
      const template =
        typeof translated === "string"
          ? translated
          : typeof fallback === "string"
            ? fallback
            : key;

      return formatMessage(template, values);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  const pathname = usePathname();
  const pathLocale = getPathLocale(pathname);
  const [localLocale, setLocalLocale] = useState<Locale>(
    pathLocale ?? context?.locale ?? "ko",
  );

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  useEffect(() => {
    const storedCandidate =
      typeof window === "undefined"
        ? undefined
        : window.localStorage.getItem("locale") ?? undefined;
    const nextLocale =
      getPathLocale(pathname) ??
      (isLocale(storedCandidate) ? storedCandidate : context.locale);

    setLocalLocale(nextLocale);
  }, [context.locale, pathname]);

  useEffect(() => {
    const handleLocaleChange = (event: Event) => {
      const nextLocale = (event as CustomEvent<Locale>).detail;
      if (isLocale(nextLocale)) {
        setLocalLocale(nextLocale);
      }
    };

    window.addEventListener(localeChangeEvent, handleLocaleChange);
    return () => window.removeEventListener(localeChangeEvent, handleLocaleChange);
  }, []);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      setLocalLocale(nextLocale);
      context.setLocale(nextLocale);
    },
    [context],
  );

  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      const translated = readMessage(messages[localLocale], key);
      const fallback = readMessage(messages.ko, key);
      const template =
        typeof translated === "string"
          ? translated
          : typeof fallback === "string"
            ? fallback
            : key;

      return formatMessage(template, values);
    },
    [localLocale],
  );

  return useMemo(
    () => ({ locale: localLocale, setLocale, t }),
    [localLocale, setLocale, t],
  );
}
