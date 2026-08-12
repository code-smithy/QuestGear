export const locales = ["de", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

export const localeLabels: Record<Locale, string> = {
  de: "Deutsch",
  en: "English"
};

const de = {
  "app.brandHome": "QuestGear Startseite",
  "nav.primary": "Hauptnavigation",
  "nav.home": "Start",
  "nav.browse": "Suchen",
  "nav.inventory": "Inventar",
  "nav.requests": "Anfragen",
  "nav.loans": "Ausleihen",
  "nav.notifications": "Mitteilungen",
  "language.label": "Sprache",
  "login.eyebrow": "Tabletop-Verleih",
  "login.description":
    "Katalogisiere Tabletop-Ausrüstung, frage Ausleihen bei vertrauenswürdigen Spielern an und behalte Übergaben, Rückgaben und Zuverlässigkeit an einem Ort.",
  "login.discord": "Mit Discord fortfahren",
  "home.eyebrow": "Übersicht",
  "home.title": "Startseite",
  "home.intro":
    "Phase 0 erstellt das App-Grundgerüst. Authentifizierte Dashboard-Daten folgen in den nächsten Implementierungsphasen.",
  "home.sections": "Dashboard-Bereiche",
  "home.requests.title": "Anfragen",
  "home.requests.empty": "Noch keine Anfragen benötigen Aufmerksamkeit.",
  "home.borrowing.title": "Ausgeliehen",
  "home.borrowing.empty": "Ausgeliehene Gegenstände erscheinen hier.",
  "home.lending.title": "Verliehen",
  "home.lending.empty": "Verliehene Gegenstände erscheinen hier.",
  "browse.eyebrow": "Entdecken",
  "browse.title": "Suchen",
  "browse.intro":
    "Suche und Filter für veröffentlichte Inventare werden nach dem Inventar-Datenmodell implementiert.",
  "inventory.eyebrow": "Sammlung",
  "inventory.title": "Mein Inventar",
  "inventory.intro":
    "Entwürfe, veröffentlichte, nicht verfügbare und archivierte Gegenstände werden in Phase 2 umgesetzt.",
  "placeholder.eyebrow": "Demnächst",
  "placeholder.intro": "Diese Route ist für eine kommende Implementierungsphase reserviert.",
  "routes.newItem": "Neuer Gegenstand",
  "routes.itemDetail": "Gegenstandsdetails",
  "routes.editItem": "Gegenstand bearbeiten",
  "routes.onboarding": "Onboarding",
  "routes.requests": "Anfragen",
  "routes.loans": "Ausleihen",
  "routes.loanDetail": "Ausleihdetails",
  "routes.notifications": "Mitteilungen",
  "routes.profile": "Profil",
  "routes.settings": "Einstellungen",
  "routes.reliability": "Zuverlässigkeit",
  "routes.notFound": "Seite nicht gefunden"
} as const;

const en: Record<keyof typeof de, string> = {
  "app.brandHome": "QuestGear home",
  "nav.primary": "Primary",
  "nav.home": "Home",
  "nav.browse": "Browse",
  "nav.inventory": "Inventory",
  "nav.requests": "Requests",
  "nav.loans": "Loans",
  "nav.notifications": "Notifications",
  "language.label": "Language",
  "login.eyebrow": "Tabletop lending",
  "login.description":
    "Catalogue tabletop gear, request loans from trusted players, and keep handovers, returns, and reliability in one place.",
  "login.discord": "Continue with Discord",
  "home.eyebrow": "Dashboard",
  "home.title": "Home",
  "home.intro":
    "Phase 0 establishes the app shell. Authenticated dashboard data arrives in the implementation phases that follow.",
  "home.sections": "Dashboard sections",
  "home.requests.title": "Requests",
  "home.requests.empty": "No requests need attention yet.",
  "home.borrowing.title": "Borrowing",
  "home.borrowing.empty": "Borrowed items will appear here.",
  "home.lending.title": "Lending",
  "home.lending.empty": "Lent items will appear here.",
  "browse.eyebrow": "Discovery",
  "browse.title": "Browse",
  "browse.intro":
    "Published inventory search and filters will be implemented after the inventory data model.",
  "inventory.eyebrow": "Collection",
  "inventory.title": "My Inventory",
  "inventory.intro":
    "Draft, published, unavailable, and archived item management will be built in Phase 2.",
  "placeholder.eyebrow": "Coming next",
  "placeholder.intro": "This route is reserved for an upcoming implementation phase.",
  "routes.newItem": "New Item",
  "routes.itemDetail": "Item Detail",
  "routes.editItem": "Edit Item",
  "routes.onboarding": "Onboarding",
  "routes.requests": "Requests",
  "routes.loans": "Loans",
  "routes.loanDetail": "Loan Detail",
  "routes.notifications": "Notifications",
  "routes.profile": "Profile",
  "routes.settings": "Settings",
  "routes.reliability": "Reliability",
  "routes.notFound": "Page Not Found"
};

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  de,
  en
};

export type TranslationKey = keyof typeof de;
