# 0001: Multilingual Foundation

**Status:** Accepted  
**Date:** 2026-08-12

## Context

The original requirements listed English as the initial interface language. The product direction now requires multilingual support from the start, with German as the default language and English as an available language.

## Decision

QuestGear will support German and English in the MVP. German is the default locale.

The frontend will include a typed translation layer during Phase 0. User-facing strings should be referenced through translation keys rather than embedded directly in components.

The user's selected locale is stored in local browser storage for Phase 0. When authenticated profiles are implemented, `profiles` should include a preferred locale field so the setting can follow the user across devices.

## Consequences

- New UI work must add both German and English copy.
- Component tests should assert behavior using accessible labels without assuming English-only text.
- Date, time, and number formatting should use the active locale once those displays are implemented.
- Database enums, event types, and trusted operation names remain stable internal identifiers and are not translated.
