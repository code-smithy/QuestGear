import { useI18n } from "@/lib/i18n/useI18n";
import type { TranslationKey } from "@/lib/i18n/translations";

type PlaceholderPageProps = {
  titleKey: TranslationKey;
};

export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useI18n();

  return (
    <section className="page-section" aria-labelledby="placeholder-title">
      <p className="eyebrow">{t("placeholder.eyebrow")}</p>
      <h1 id="placeholder-title">{t(titleKey)}</h1>
      <p className="page-intro">{t("placeholder.intro")}</p>
    </section>
  );
}
