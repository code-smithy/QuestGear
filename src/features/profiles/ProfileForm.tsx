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
        <input
          autoComplete="name"
          aria-label={t("profile.displayName")}
          aria-invalid={Boolean(errors.displayName) || undefined}
          aria-describedby={errors.displayName ? "profile-display-name-error" : undefined}
          {...register("displayName")}
        />
        <FieldError id="profile-display-name-error" message={errors.displayName?.message} />
      </label>

      <label>
        <span>{t("profile.publicRegion")}</span>
        <input
          autoComplete="address-level2"
          aria-label={t("profile.publicRegion")}
          aria-invalid={Boolean(errors.publicRegion) || undefined}
          aria-describedby={errors.publicRegion ? "profile-public-region-error" : undefined}
          {...register("publicRegion")}
        />
        <FieldError id="profile-public-region-error" message={errors.publicRegion?.message} />
      </label>

      <label>
        <span>{t("profile.countryCode")}</span>
        <input
          autoComplete="country"
          maxLength={2}
          aria-label={t("profile.countryCode")}
          aria-invalid={Boolean(errors.countryCode) || undefined}
          aria-describedby={errors.countryCode ? "profile-country-code-error" : undefined}
          {...register("countryCode")}
        />
        <FieldError id="profile-country-code-error" message={errors.countryCode?.message} />
      </label>

      <label>
        <span>{t("profile.timeZone")}</span>
        <input
          autoComplete="off"
          aria-label={t("profile.timeZone")}
          aria-invalid={Boolean(errors.timeZone) || undefined}
          aria-describedby={errors.timeZone ? "profile-time-zone-error" : undefined}
          {...register("timeZone")}
        />
        <FieldError id="profile-time-zone-error" message={errors.timeZone?.message} />
      </label>

      <label>
        <span>{t("profile.reminderLeadDays")}</span>
        <input
          type="number"
          min={0}
          max={30}
          aria-label={t("profile.reminderLeadDays")}
          aria-invalid={Boolean(errors.reminderLeadDays) || undefined}
          aria-describedby={errors.reminderLeadDays ? "profile-reminder-lead-days-error" : undefined}
          {...register("reminderLeadDays")}
        />
        <FieldError id="profile-reminder-lead-days-error" message={errors.reminderLeadDays?.message} />
      </label>

      <label>
        <span>{t("profile.preferredLocale")}</span>
        <select
          aria-label={t("profile.preferredLocale")}
          aria-invalid={Boolean(errors.preferredLocale) || undefined}
          aria-describedby={errors.preferredLocale ? "profile-preferred-locale-error" : undefined}
          {...register("preferredLocale")}
        >
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {localeLabels[locale]}
            </option>
          ))}
        </select>
        <FieldError id="profile-preferred-locale-error" message={errors.preferredLocale?.message} />
      </label>

      <label>
        <span>{t("profile.preferredCurrency")}</span>
        <select
          aria-label={t("profile.preferredCurrency")}
          aria-invalid={Boolean(errors.preferredCurrency) || undefined}
          aria-describedby={errors.preferredCurrency ? "profile-preferred-currency-error" : undefined}
          {...register("preferredCurrency")}
        >
          {supportedCurrencies.map((currency) => (
            <option key={currency} value={currency}>
              {currencyLabels[currency]}
            </option>
          ))}
        </select>
        <FieldError id="profile-preferred-currency-error" message={errors.preferredCurrency?.message} />
      </label>

      <label className="checkbox-field">
        <input type="checkbox" {...register("browserPushEnabled")} />
        <span>{t("profile.browserPushEnabled")}</span>
      </label>

      <label className="full-width">
        <span>{t("profile.bio")}</span>
        <textarea
          rows={5}
          aria-label={t("profile.bio")}
          aria-invalid={Boolean(errors.bio) || undefined}
          aria-describedby={errors.bio ? "profile-bio-error" : undefined}
          {...register("bio")}
        />
        <FieldError id="profile-bio-error" message={errors.bio?.message} />
      </label>

      <fieldset className="full-width profile-location-fieldset">
        <legend>{t("profile.locations")}</legend>
        <p>{t("profile.locationsIntro")}</p>
        {locations.fields.map((field, index) => {
          const locationErrors = errors.locations?.[index];
          const locationPrefix = `profile-location-${index}`;
          const latDescriptionIds = [
            `${locationPrefix}-region-lat-hint`,
            locationErrors?.regionCenterLat ? `${locationPrefix}-region-lat-error` : null
          ].filter(Boolean).join(" ");
          const lngDescriptionIds = [
            `${locationPrefix}-region-lng-hint`,
            locationErrors?.regionCenterLng ? `${locationPrefix}-region-lng-error` : null
          ].filter(Boolean).join(" ");

          return (
            <div className="repeated-row profile-location-row" key={field.id}>
              <label>
                <span>{t("profile.locationLabel")}</span>
                <input
                  aria-label={t("profile.locationLabel")}
                  aria-invalid={Boolean(locationErrors?.label) || undefined}
                  aria-describedby={locationErrors?.label ? `${locationPrefix}-label-error` : undefined}
                  {...register(`locations.${index}.label`)}
                />
                <FieldError id={`${locationPrefix}-label-error`} message={locationErrors?.label?.message} />
              </label>
              <label>
                <span>{t("profile.locationPublicRegion")}</span>
                <input
                  aria-label={t("profile.locationPublicRegion")}
                  aria-invalid={Boolean(locationErrors?.publicRegion) || undefined}
                  aria-describedby={
                    locationErrors?.publicRegion ? `${locationPrefix}-public-region-error` : undefined
                  }
                  {...register(`locations.${index}.publicRegion`)}
                />
                <FieldError
                  id={`${locationPrefix}-public-region-error`}
                  message={locationErrors?.publicRegion?.message}
                />
              </label>
              <label>
                <span>{t("profile.locationPrivateAddress")}</span>
                <input
                  autoComplete="street-address"
                  aria-label={t("profile.locationPrivateAddress")}
                  aria-invalid={Boolean(locationErrors?.privateAddress) || undefined}
                  aria-describedby={
                    locationErrors?.privateAddress ? `${locationPrefix}-private-address-error` : undefined
                  }
                  {...register(`locations.${index}.privateAddress`)}
                />
                <FieldError
                  id={`${locationPrefix}-private-address-error`}
                  message={locationErrors?.privateAddress?.message}
                />
              </label>
              <label>
                <span>{t("profile.locationMapUrl")}</span>
                <input
                  aria-label={t("profile.locationMapUrl")}
                  aria-invalid={Boolean(locationErrors?.mapUrl) || undefined}
                  aria-describedby={locationErrors?.mapUrl ? `${locationPrefix}-map-url-error` : undefined}
                  {...register(`locations.${index}.mapUrl`)}
                />
                <FieldError id={`${locationPrefix}-map-url-error`} message={locationErrors?.mapUrl?.message} />
              </label>
              <label>
                <span>{t("profile.locationRegionLat")}</span>
                <span className="field-hint" id={`${locationPrefix}-region-lat-hint`}>
                  {t("profile.locationRegionLatHint")}
                </span>
                <input
                  type="number"
                  step="0.000001"
                  aria-label={t("profile.locationRegionLat")}
                  aria-invalid={Boolean(locationErrors?.regionCenterLat) || undefined}
                  aria-describedby={latDescriptionIds}
                  {...register(`locations.${index}.regionCenterLat`)}
                />
                <FieldError
                  id={`${locationPrefix}-region-lat-error`}
                  message={locationErrors?.regionCenterLat?.message}
                />
              </label>
              <label>
                <span>{t("profile.locationRegionLng")}</span>
                <span className="field-hint" id={`${locationPrefix}-region-lng-hint`}>
                  {t("profile.locationRegionLngHint")}
                </span>
                <input
                  type="number"
                  step="0.000001"
                  aria-label={t("profile.locationRegionLng")}
                  aria-invalid={Boolean(locationErrors?.regionCenterLng) || undefined}
                  aria-describedby={lngDescriptionIds}
                  {...register(`locations.${index}.regionCenterLng`)}
                />
                <FieldError
                  id={`${locationPrefix}-region-lng-error`}
                  message={locationErrors?.regionCenterLng?.message}
                />
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
          );
        })}
        <FieldError id="profile-locations-error" message={errors.locations?.message} />
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

function FieldError({ id, message }: { id: string; message?: string }) {
  const { t } = useI18n();

  if (!message) {
    return null;
  }

  return (
    <span className="field-error" id={id}>
      {t(message as Parameters<typeof t>[0])}
    </span>
  );
}
