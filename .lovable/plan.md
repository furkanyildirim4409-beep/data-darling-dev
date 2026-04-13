

## Remove Mock Profile and Enforce Real Auth Data

### Problem
`ProfileContext.tsx` uses hardcoded mock data ("Koç Davis", fake avatar, fake stats). The `TopBar` and `AppSidebar` already correctly use `useAuth()` for real Supabase data, so the issue is isolated to the **Content Studio** components: `ProfileSettings.tsx` and `MobileProfilePreview.tsx`.

### Plan

#### 1. Refactor `ProfileContext.tsx`
- Remove the hardcoded `defaultProfile` object entirely
- Source initial values from `useAuth()` profile (`full_name`, `bio`, `avatar_url`, `specialty`)
- Keep local state for real-time preview sync (title, bio edits reflect immediately in `MobileProfilePreview`)
- Social stats (followers, posts, engagement) remain as display-only placeholders until a real social integration exists — but labeled as "Demo" or zeroed out

#### 2. Update `ProfileSettings.tsx`
- Replace the fake `handleSave` (which just sleeps 1s) with a real call to `update_own_profile` RPC (already exists per memory) or direct Supabase profile update
- Use `useAuth().refreshProfile()` after save to sync the global auth context
- Wire the avatar upload button to the existing `avatars` storage bucket
- Switch toast to `sonner` for consistency

#### 3. Update `MobileProfilePreview.tsx`
- Adapt field references from `profile.name` → `profile.name` (stays the same since ProfileContext maps it)
- `profile.avatarUrl` now comes from real `avatar_url`

#### 4. Verify TopBar + Sidebar (no changes needed)
- `TopBar.tsx` already uses `useAuth()` for name and avatar — confirmed, no mock data
- `AppSidebar.tsx` has no profile display — confirmed, no changes needed

### Files
| File | Action |
|------|--------|
| `src/contexts/ProfileContext.tsx` | MODIFY — source from `useAuth()`, remove hardcoded defaults |
| `src/components/content-studio/ProfileSettings.tsx` | MODIFY — wire real save via RPC, avatar upload |
| `src/components/content-studio/MobileProfilePreview.tsx` | MINOR — adjust field mapping if needed |

