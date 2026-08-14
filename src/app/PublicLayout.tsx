import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { LanguageSwitcher } from "@/features/settings/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/useI18n";

export function PublicLayout() {
  const { t } = useI18n();
  const { isLoading, signOut, user } = useAuth();

  return (
    <div className="app-shell">
      <header className="site-header public-site-header">
        <Link className="brand" to={user ? "/home" : "/login"} aria-label={t("app.brandHome")}>
          <span className="brand-mark" aria-hidden="true">
            QG
          </span>
          <span>QuestGear</span>
        </Link>
        <div className="header-actions public-header-actions">
          {!isLoading && !user ? <LanguageSwitcher /> : null}
          {isLoading ? null : user ? (
            <button type="button" className="secondary-button" onClick={() => void signOut()}>
              {t("auth.logout")}
            </button>
          ) : (
            <Link className="secondary-button button-link" to="/login">
              {t("auth.login")}
            </Link>
          )}
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
