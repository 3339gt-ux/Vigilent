# Settings

The Settings page includes local appearance preferences for the current browser:

- theme preference: `system`, `light`, or `dark`
- accent colour: blue, teal, emerald, purple, or amber
- colour mode: default or colorful

Preferences are stored in `localStorage` with `vygilence_*` keys. The legacy `vigilen_theme` key is still read for compatibility and written when users choose a direct light/dark theme.

These settings are presentation-only. They do not change organisation data, Supabase records, RLS policies, evidence storage, or readiness calculations.

## Test Checklist

- [ ] Set theme to System and confirm it follows the operating system preference.
- [ ] Set theme to Light and refresh the page.
- [ ] Set theme to Dark and refresh the page.
- [ ] Change accent colour and confirm primary controls use the chosen accent after refresh.
- [ ] Toggle colorful mode and confirm the choice persists after refresh.
