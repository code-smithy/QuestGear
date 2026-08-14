import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { LanguageSwitcher } from "@/features/settings/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/useI18n";
import type { TranslationKey } from "@/lib/i18n/translations";

const navItems: Array<{ to: string; labelKey: TranslationKey }> = [
  { to: "/home", labelKey: "nav.home" },
  { to: "/browse", labelKey: "nav.browse" },
  { to: "/inventory", labelKey: "nav.inventory" },
  { to: "/requests", labelKey: "nav.requests" },
  { to: "/loans", labelKey: "nav.loans" },
  { to: "/notifications", labelKey: "nav.notifications" },
  { to: "/settings", labelKey: "nav.settings" }
];

export function AppLayout() {
  const { t } = useI18n();
  const { signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/home" aria-label={t("app.brandHome")}>
          <span className="brand-mark" aria-hidden="true">
            QG
          </span>
          <span>QuestGear</span>
        </NavLink>
        <nav className="primary-nav" aria-label={t("nav.primary")}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitcher />
          <button type="button" className="secondary-button" onClick={() => void signOut()}>
            {t("auth.logout")}
          </button>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
