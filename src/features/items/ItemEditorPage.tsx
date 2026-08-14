import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { getItemDetail, saveItem } from "@/features/items/itemApi";
import {
  damageSeverities,
  getDefaultItemFormValues,
  itemCategories,
  itemConditions,
  itemFormSchema,
  itemStates,
  type ItemDetail,
  type ItemFormValues
} from "@/features/items/itemSchema";
import { currencyLabels, supportedCurrencies } from "@/lib/currency";
import {
  categoryLabelKeys,
  conditionLabelKeys,
  severityLabelKeys,
  stateLabelKeys
} from "@/features/items/itemLabels";
import { useI18n } from "@/lib/i18n/useI18n";
import type { TranslationKey } from "@/lib/i18n/translations";

export function ItemEditorPage() {
  const { t } = useI18n();
  const { itemId } = useParams();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">(
    itemId ? "loading" : "ready"
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues = useMemo(
    () => getDefaultItemFormValues(profile?.publicRegion ?? "", profile?.preferredCurrency),
    [profile?.preferredCurrency, profile?.publicRegion]
  );
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues
  });
  const contents = useFieldArray({ control, name: "contents" });
  const damage = useFieldArray({ control, name: "damage" });

  useEffect(() => {
    let isMounted = true;

    async function loadItem() {
      if (!itemId) {
        reset(defaultValues);
        setStatus("ready");
        return;
      }

      try {
        const item = await getItemDetail(itemId);

        if (!isMounted) {
          return;
        }

        if (!item || item.ownerId !== user?.id) {
          setStatus("missing");
          return;
        }

        reset(detailToFormValues(item));
        setStatus("ready");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    void loadItem();

    return () => {
      isMounted = false;
    };
  }, [defaultValues, itemId, reset, user?.id]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentUser = user;

  async function onSubmit(values: ItemFormValues) {
    setSubmitError(null);

    try {
      const savedItemId = await saveItem(currentUser.id, values, itemId);
      void navigate(`/items/${savedItemId}`, { replace: true });
    } catch {
      setSubmitError(t("item.saveError"));
    }
  }

  if (status === "loading") {
    return <p role="status">{t("item.loading")}</p>;
  }

  if (status === "error") {
    return <p role="alert">{t("item.loadError")}</p>;
  }

  if (status === "missing") {
    return <p role="status">{t("item.notFound")}</p>;
  }

  return (
    <section className="page-section" aria-labelledby="item-editor-title">
      <div>
        <p className="eyebrow">{t("item.editorEyebrow")}</p>
        <h1 id="item-editor-title">{itemId ? t("item.editTitle") : t("item.newTitle")}</h1>
        <p className="page-intro">{t("item.editorIntro")}</p>
      </div>
      {submitError ? <p className="alert" role="alert">{submitError}</p> : null}
      <form className="item-form" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
        <fieldset>
          <legend>{t("item.sectionBasics")}</legend>
          <label>
            <span>{t("item.title")}</span>
            <input {...register("title")} />
            <FieldError message={errors.title?.message} />
          </label>
          <label className="full-width">
            <span>{t("item.description")}</span>
            <textarea rows={6} {...register("description")} />
            <FieldError message={errors.description?.message} />
          </label>
          <label>
            <span>{t("item.category")}</span>
            <select {...register("category")}>
              {itemCategories.map((category) => (
                <option key={category} value={category}>
                  {t(categoryLabelKeys[category])}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("item.condition")}</span>
            <select {...register("condition")}>
              {itemConditions.map((condition) => (
                <option key={condition} value={condition}>
                  {t(conditionLabelKeys[condition])}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("item.publicRegion")}</span>
            <input {...register("publicRegion")} />
            <FieldError message={errors.publicRegion?.message} />
          </label>
          <label>
            <span>{t("item.state")}</span>
            <select {...register("state")}>
              {itemStates.map((state) => (
                <option key={state} value={state}>
                  {t(stateLabelKeys[state])}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("item.sectionAttributes")}</legend>
          <label>
            <span>{t("item.gameSystem")}</span>
            <input {...register("gameSystem")} />
          </label>
          <label>
            <span>{t("item.manufacturer")}</span>
            <input {...register("manufacturer")} />
          </label>
          <label>
            <span>{t("item.language")}</span>
            <input {...register("language")} />
          </label>
          <label>
            <span>{t("item.tags")}</span>
            <input {...register("tagsText")} />
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("item.sectionRules")}</legend>
          <label>
            <span>{t("item.minimumNoticeDays")}</span>
            <input type="number" min={0} max={90} {...register("minimumNoticeDays")} />
          </label>
          <label>
            <span>{t("item.maximumLoanDays")}</span>
            <input type="number" min={1} max={365} {...register("maximumLoanDays")} />
          </label>
          <label>
            <span>{t("item.replacementValue")}</span>
            <input type="number" min={0} step="0.01" {...register("replacementValue")} />
          </label>
          <label>
            <span>{t("item.replacementValueCurrency")}</span>
            <select {...register("replacementValueCurrency")}>
              {supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyLabels[currency]}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-field">
            <input type="checkbox" {...register("fragile")} />
            <span>{t("item.fragile")}</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("item.sectionContents")}</legend>
          {contents.fields.map((field, index) => (
            <div className="repeated-row" key={field.id}>
              <label>
                <span>{t("item.contentName")}</span>
                <input {...register(`contents.${index}.name`)} />
                <FieldError message={errors.contents?.[index]?.name?.message} />
              </label>
              <label>
                <span>{t("item.contentQuantity")}</span>
                <input type="number" min={1} {...register(`contents.${index}.quantity`)} />
              </label>
              <label>
                <span>{t("item.condition")}</span>
                <select {...register(`contents.${index}.condition`)}>
                  {itemConditions.map((condition) => (
                    <option key={condition} value={condition}>
                      {t(conditionLabelKeys[condition])}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("item.contentNote")}</span>
                <input {...register(`contents.${index}.note`)} />
              </label>
              <button type="button" className="secondary-button" onClick={() => contents.remove(index)}>
                {t("item.removeRow")}
              </button>
            </div>
          ))}
          <FieldError message={errors.contents?.message} />
          <button
            type="button"
            className="secondary-button"
            onClick={() => contents.append({ name: "", quantity: 1, condition: "good", note: "" })}
          >
            {t("item.addContent")}
          </button>
        </fieldset>

        <fieldset>
          <legend>{t("item.sectionDamage")}</legend>
          {damage.fields.map((field, index) => (
            <div className="repeated-row" key={field.id}>
              <label>
                <span>{t("item.damageType")}</span>
                <input {...register(`damage.${index}.damageType`)} />
              </label>
              <label>
                <span>{t("item.damageSeverity")}</span>
                <select {...register(`damage.${index}.severity`)}>
                  {damageSeverities.map((severity) => (
                    <option key={severity} value={severity}>
                      {t(severityLabelKeys[severity])}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("item.damageDescription")}</span>
                <input {...register(`damage.${index}.description`)} />
                <FieldError message={errors.damage?.[index]?.description?.message} />
              </label>
              <button type="button" className="secondary-button" onClick={() => damage.remove(index)}>
                {t("item.removeRow")}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary-button"
            onClick={() => damage.append({ damageType: "", severity: "cosmetic", description: "" })}
          >
            {t("item.addDamage")}
          </button>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? t("item.saving") : t("item.save")}
          </button>
        </div>
      </form>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  const { t } = useI18n();

  if (!message) {
    return null;
  }

  return <span className="field-error">{t(message as TranslationKey)}</span>;
}

function detailToFormValues(item: ItemDetail): ItemFormValues {
  return {
    title: item.title,
    description: item.description,
    category: item.category,
    condition: item.condition,
    publicRegion: item.publicRegion,
    gameSystem: item.gameSystem ?? "",
    manufacturer: item.manufacturer ?? "",
    language: item.language ?? "",
    tagsText: item.tags.join(", "),
    fragile: item.fragile,
    minimumNoticeDays: item.minimumNoticeDays,
    maximumLoanDays: item.maximumLoanDays,
    replacementValue: item.replacementValue ?? "",
    replacementValueCurrency: item.replacementValueCurrency ?? "EUR",
    contents: item.contents.length
      ? item.contents.map((entry) => ({
          name: entry.name,
          quantity: entry.quantity,
          condition: entry.condition,
          note: entry.note
        }))
      : [{ name: "", quantity: 1, condition: "good", note: "" }],
    damage: item.damage.map((entry) => ({
      damageType: entry.damageType,
      severity: entry.severity,
      description: entry.description
    })),
    state: item.state
  };
}
