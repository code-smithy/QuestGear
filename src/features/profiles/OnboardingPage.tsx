import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { ProfileForm } from "@/features/profiles/ProfileForm";
import { getDefaultProfileFormValues, profileFormSchema } from "@/features/profiles/profileSchema";
import { saveOwnProfile } from "@/features/profiles/profileApi";
import { useI18n } from "@/lib/i18n/useI18n";

export function OnboardingPage() {
  const { locale, t } = useI18n();
  const { profile, refreshProfile, user } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (profile) {
    return <Navigate to="/home" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentUser = user;
  const metadataName =
    typeof currentUser.user_metadata?.full_name === "string"
      ? currentUser.user_metadata.full_name
      : typeof currentUser.user_metadata?.name === "string"
        ? currentUser.user_metadata.name
        : null;

  async function handleSubmit(values: unknown) {
    const parsed = profileFormSchema.parse(values);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await saveOwnProfile(currentUser.id, parsed);
      await refreshProfile();
      void navigate("/home", { replace: true });
    } catch {
      setSubmitError(t("profile.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-section" aria-labelledby="onboarding-title">
      <div>
        <p className="eyebrow">{t("onboarding.eyebrow")}</p>
        <h1 id="onboarding-title">{t("onboarding.title")}</h1>
        <p className="page-intro">{t("onboarding.intro")}</p>
      </div>
      {submitError ? <p className="alert" role="alert">{submitError}</p> : null}
      <ProfileForm
        defaultValues={getDefaultProfileFormValues({ displayName: metadataName, locale })}
        submitLabel={t("onboarding.submit")}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
