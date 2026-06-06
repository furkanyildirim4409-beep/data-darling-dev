## Plan: Add IBAN Management to Subscription Section

Edit `src/pages/Settings.tsx` only.

### Changes

1. **Rename sidebar item** — Update `settingsSections` entry `subscription` label from `"Abonelik"` to `"Abonelik & Ödeme Bilgisi"`.

2. **Local IBAN state** — Add `iban` state synced from `profile.iban` via the existing `useEffect` that already syncs profile fields. Add `isSavingIban` flag for the save button.

3. **Save handler** — `handleSaveIban` updates `profiles.iban` for `user.id` via supabase, refreshes profile through `refreshProfile()`, and toasts success/error in Turkish.

4. **UI block** — Append a new Card-style panel inside the `activeSection === "subscription"` branch (after the plans grid, inside the same outer wrapper). Use the existing project's `glass`/`border-border` styling to stay consistent with current Settings cards (rather than literal `bg-black/20` overrides) so it matches the dark glass aesthetic and theme tokens. Contents:
   - Heading: "Banka ve Hakediş Bilgileri"
   - Description: "Hakedişlerinizin yatırılacağı IBAN adresini buradan yönetebilirsiniz."
   - `<Label>` + `<Input>` with `placeholder="TR00 0000 0000 0000 0000 0000 00"`, `font-mono tracking-widest`, value/onChange bound to `iban`
   - Save `<Button>` "Banka Bilgilerini Kaydet" wired to `handleSaveIban`, disabled while saving

5. **Imports** — Add `Label` from `@/components/ui/label` (Card components not needed since we'll reuse the existing `glass rounded-xl` wrapper pattern used throughout this file).

### Out of scope
- No schema changes (column already exists).
- No changes to `AuthContext` `Profile` type (read `iban` via cast since the file already uses `as any` casts for similar new columns).
- No changes to other Settings sections.
