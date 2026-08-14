import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { getPublicEnv } from "@/lib/env";
import { useI18n } from "@/lib/i18n/useI18n";
import { supabase } from "@/lib/supabase";

export function LoginPage() {
  const env = getPublicEnv();
  const { t } = useI18n();
  const { isLoading, profile, user } = useAuth();

  if (!isLoading && user) {
    return <Navigate to={profile ? "/home" : "/onboarding"} replace />;
  }

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
