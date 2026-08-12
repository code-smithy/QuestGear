import { createContext } from "react";
import type { Locale, TranslationKey } from "@/lib/i18n/translations";

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

export const I18nContext = createContext<I18nContextValue | undefined>(undefined);
