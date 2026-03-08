

# Settings Page — Supabase Connection Fix

## Current State Analysis

The Settings page is **already mostly wired up** from a previous edit. However, there are specific issues to fix:

1. **Notification column mismatch**: The code saves to `notification_preferences` but the user added `notification_settings` to the DB. Both columns exist in the schema — the code should save to **both** to stay in sync, or primarily use `notification_settings` as the user intended.

2. **Subscription tier not dynamic**: The subscription plan cards have `current: true` hardcoded on "Free" instead of comparing against `profile.subscription_tier`.

3. **Toast format mismatch**: User wants `toast.success("Ayarlar başarıyla güncellendi! 🛠️")` (sonner style) but code uses `useToast` hook. Will switch to sonner's `toast` import.

4. **Form state not syncing on profile load**: `useState` initializers only run once. If `profile` loads after mount, the form stays empty. Need a `useEffect` to sync form state when profile changes.

## Changes

### `src/pages/Settings.tsx`

| Change | Detail |
|--------|--------|
| Add `useEffect` to sync form state | When `profile` changes, update `formData` and `notificationPrefs` |
| Save to `notification_settings` | Update both `notification_settings` and `notification_preferences` in the save call |
| Dynamic subscription tier | Compare `profile.subscription_tier` against plan names instead of hardcoded `current` |
| Switch to sonner toast | Use `import { toast } from 'sonner'` for success/error messages with the exact format requested |
| Read `notification_settings` | Initialize toggle state from `notification_settings` field (with fallback to `notification_preferences`) |

### `src/contexts/AuthContext.tsx`

| Change | Detail |
|--------|--------|
| Add `notification_settings` to Profile interface | Map the DB column so Settings can read it |

No database migrations needed — columns already exist.

