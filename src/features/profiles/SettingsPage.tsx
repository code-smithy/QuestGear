import { useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { saveOwnProfile } from "@/features/profiles/profileApi";
import { ProfileForm } from "@/features/profiles/ProfileForm";
import { profileFormSchema, toProfileFormValues } from "@/features/profiles/profileSchema";
import { useI18n } from "@/lib/i18n/useI18n";

export function SettingsPage() {
  const { t } = useI18n();
  const { profile, refreshProfile, user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || !profile) {
    return null;
  }

  const currentUser = user;

  async function handleSubmit(values: unknown) {
    const parsed = profileFormSchema.parse(values);
    setIsSubmitting(true);
    setMessage(null);
    setSubmitError(null);

    try {
      await saveOwnProfile(currentUser.id, parsed);
      await refreshProfile();
      setMessage(t("settings.saved"));
    } catch {
      setSubmitError(t("profile.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-section" aria-labelledby="settings-title">
      <div>
        <p className="eyebrow">{t("settings.eyebrow")}</p>
        <h1 id="settings-title">{t("settings.title")}</h1>
        <p className="page-intro">{t("settings.intro")}</p>
      </div>
      {message ? <p className="success" role="status">{message}</p> : null}
      {submitError ? <p className="alert" role="alert">{submitError}</p> : null}
      <ProfileForm
        defaultValues={toProfileFormValues(profile)}
        submitLabel={t("settings.submit")}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
