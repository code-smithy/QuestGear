import { useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nContext, type I18nContextValue } from "@/lib/i18n/i18nContext";
import {
  defaultLocale,
  locales,
  translations,
  type Locale
} from "@/lib/i18n/translations";

const storageKey = "questgear.locale";

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(storageKey, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key) => translations[locale][key]
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function readStoredLocale(): Locale {
  const storedLocale = window.localStorage.getItem(storageKey);

  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  return defaultLocale;
}

function isLocale(value: string | null): value is Locale {
  return locales.some((locale) => locale === value);
}
