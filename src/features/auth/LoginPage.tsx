import { getPublicEnv } from "@/lib/env";
import { useI18n } from "@/lib/i18n/useI18n";
import { supabase } from "@/lib/supabase";

export function LoginPage() {
  const env = getPublicEnv();
  const { t } = useI18n();

  async function signInWithDiscord() {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: env.siteUrl
      }
    });
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <p className="eyebrow">{t("login.eyebrow")}</p>
        <h1 id="login-title">QuestGear</h1>
        <p>{t("login.description")}</p>
        <button type="button" className="primary-button" onClick={() => void signInWithDiscord()}>
          {t("login.discord")}
        </button>
      </section>
    </main>
  );
}
