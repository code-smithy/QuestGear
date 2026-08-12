import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";

describe("App", () => {
  it("renders the app shell on the default route", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Startseite" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Hauptnavigation" })).toBeInTheDocument();
  });
});
