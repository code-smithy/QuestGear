export const supportedCurrencies = ["USD", "EUR", "CHF"] as const;

export type SupportedCurrency = (typeof supportedCurrencies)[number];

export const defaultCurrency: SupportedCurrency = "EUR";

export const currencyLabels: Record<SupportedCurrency, string> = {
  USD: "Dollar",
  EUR: "Euro",
  CHF: "CHF"
};
