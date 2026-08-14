import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import {
  getDefaultProfileLocation,
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
    register,
    setValue,
    watch,
    control
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues
  });
  const locations = useFieldArray({ control, name: "locations" });
  const watchedLocations = watch("locations");

  function setDefaultLocation(index: number) {
    locations.fields.forEach((_, locationIndex) => {
      setValue(`locations.${locationIndex}.isDefault`, locationIndex === index, { shouldValidate: true });
    });
  }

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

      <fieldset className="full-width profile-location-fieldset">
        <legend>{t("profile.locations")}</legend>
        <p>{t("profile.locationsIntro")}</p>
        {locations.fields.map((field, index) => (
          <div className="repeated-row profile-location-row" key={field.id}>
            <label>
              <span>{t("profile.locationLabel")}</span>
              <input {...register(`locations.${index}.label`)} />
              <FieldError message={errors.locations?.[index]?.label?.message} />
            </label>
            <label>
              <span>{t("profile.locationPublicRegion")}</span>
              <input {...register(`locations.${index}.publicRegion`)} />
              <FieldError message={errors.locations?.[index]?.publicRegion?.message} />
            </label>
            <label>
              <span>{t("profile.locationPrivateAddress")}</span>
              <input autoComplete="street-address" {...register(`locations.${index}.privateAddress`)} />
              <FieldError message={errors.locations?.[index]?.privateAddress?.message} />
            </label>
            <label>
              <span>{t("profile.locationMapUrl")}</span>
              <input {...register(`locations.${index}.mapUrl`)} />
              <FieldError message={errors.locations?.[index]?.mapUrl?.message} />
            </label>
            <label>
              <span>{t("profile.locationRegionLat")}</span>
              <input type="number" step="0.000001" {...register(`locations.${index}.regionCenterLat`)} />
              <FieldError message={errors.locations?.[index]?.regionCenterLat?.message} />
            </label>
            <label>
              <span>{t("profile.locationRegionLng")}</span>
              <input type="number" step="0.000001" {...register(`locations.${index}.regionCenterLng`)} />
              <FieldError message={errors.locations?.[index]?.regionCenterLng?.message} />
            </label>
            <label className="checkbox-field compact-checkbox">
              <input
                type="checkbox"
                checked={Boolean(watchedLocations?.[index]?.isDefault)}
                onChange={() => setDefaultLocation(index)}
              />
              <span>{t("profile.locationDefault")}</span>
            </label>
            <button type="button" className="secondary-button" onClick={() => locations.remove(index)}>
              {t("item.removeRow")}
            </button>
          </div>
        ))}
        <FieldError message={errors.locations?.message} />
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            const isFirstLocation = locations.fields.length === 0;
            locations.append({
              ...getDefaultProfileLocation(watch("publicRegion")),
              isDefault: isFirstLocation
            });
          }}
        >
          {t("profile.addLocation")}
        </button>
      </fieldset>

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
