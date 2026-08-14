import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  profileFormSchema,
  type ProfileFormValues
} from "@/features/profiles/profileSchema";
import { currencyLabels, supportedCurrencies } from "@/lib/currency";
import { localeLabels, locales } from "@/lib/i18n/translations";
import { useI18n } from "@/lib/i18n/useI18n";

type ProfileFormProps = {
  defaultValues: ProfileFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
};

export function ProfileForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit
}: ProfileFormProps) {
  const { t } = useI18n();
  const {
    formState: { errors },
    handleSubmit,
    register
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues
  });

  return (
    <form className="profile-form" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <label>
        <span>{t("profile.displayName")}</span>
        <input autoComplete="name" {...register("displayName")} />
        <FieldError message={errors.displayName?.message} />
      </label>

      <label>
        <span>{t("profile.publicRegion")}</span>
        <input autoComplete="address-level2" {...register("publicRegion")} />
        <FieldError message={errors.publicRegion?.message} />
      </label>

      <label>
        <span>{t("profile.countryCode")}</span>
        <input autoComplete="country" maxLength={2} {...register("countryCode")} />
        <FieldError message={errors.countryCode?.message} />
      </label>

      <label>
        <span>{t("profile.timeZone")}</span>
        <input autoComplete="off" {...register("timeZone")} />
        <FieldError message={errors.timeZone?.message} />
      </label>

      <label>
        <span>{t("profile.reminderLeadDays")}</span>
        <input type="number" min={0} max={30} {...register("reminderLeadDays")} />
        <FieldError message={errors.reminderLeadDays?.message} />
      </label>

      <label>
        <span>{t("profile.preferredLocale")}</span>
        <select {...register("preferredLocale")}>
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {localeLabels[locale]}
            </option>
          ))}
        </select>
        <FieldError message={errors.preferredLocale?.message} />
      </label>

      <label>
        <span>{t("profile.preferredCurrency")}</span>
        <select {...register("preferredCurrency")}>
          {supportedCurrencies.map((currency) => (
            <option key={currency} value={currency}>
              {currencyLabels[currency]}
            </option>
          ))}
        </select>
        <FieldError message={errors.preferredCurrency?.message} />
      </label>

      <label className="checkbox-field">
        <input type="checkbox" {...register("browserPushEnabled")} />
        <span>{t("profile.browserPushEnabled")}</span>
      </label>

      <label className="full-width">
        <span>{t("profile.bio")}</span>
        <textarea rows={5} {...register("bio")} />
        <FieldError message={errors.bio?.message} />
      </label>

      <div className="form-actions full-width">
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? t("profile.saving") : submitLabel}
        </button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  const { t } = useI18n();

  if (!message) {
    return null;
  }

  return <span className="field-error">{t(message as Parameters<typeof t>[0])}</span>;
}
