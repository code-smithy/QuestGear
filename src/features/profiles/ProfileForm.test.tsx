import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "@/features/profiles/ProfileForm";
import { getDefaultProfileFormValues } from "@/features/profiles/profileSchema";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

describe("ProfileForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows field-level validation errors before submitting invalid data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <I18nProvider>
        <ProfileForm
          defaultValues={getDefaultProfileFormValues({ displayName: "", locale: "de" })}
          submitLabel="Profil erstellen"
          isSubmitting={false}
          onSubmit={onSubmit}
        />
      </I18nProvider>
    );

    await user.click(screen.getByRole("button", { name: "Profil erstellen" }));

    expect(await screen.findByText("Der Anzeigename braucht mindestens 2 Zeichen.")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
