import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { LanguageSwitcher } from "@/features/settings/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/useI18n";

function Probe() {
  const { t } = useI18n();

  return (
    <>
      <h1>{t("home.title")}</h1>
      <LanguageSwitcher />
    </>
  );
}

describe("I18nProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "";
  });

  it("uses German by default", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { name: "Startseite" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "de");
  });

  it("persists an English locale selection", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    await user.selectOptions(screen.getByLabelText("Sprache"), "en");

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(window.localStorage.getItem("questgear.locale")).toBe("en");
  });
});
