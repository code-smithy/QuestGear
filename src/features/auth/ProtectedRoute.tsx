import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { useI18n } from "@/lib/i18n/useI18n";

type ProtectedRouteProps = {
  requireProfile?: boolean;
};

export function ProtectedRoute({ requireProfile = true }: ProtectedRouteProps) {
  const { t } = useI18n();
  const { isLoading, profile, profileError, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="main-content">
        <p role="status">{t("auth.loading")}</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profileError) {
    return (
      <main className="main-content">
        <section className="page-section" aria-labelledby="auth-error-title">
          <h1 id="auth-error-title">{t("auth.profileLoadErrorTitle")}</h1>
          <p className="page-intro">{t(profileError)}</p>
        </section>
      </main>
    );
  }

  if (requireProfile && !profile && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
