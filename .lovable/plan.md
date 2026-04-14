

## Viewer-to-Lead Conversion System

### Overview
Make viewer rows in `ActiveStoriesDialog` clickable. Check the viewer's `coach_id` in the `profiles` table to route them: existing student → navigate, other coach's student → error toast, free lead → invitation modal.

### Plan

#### 1. Add `useCheckViewerStatus` hook (`src/hooks/useSocialMutations.ts`)
- New function accepting `viewerId: string`
- Queries `profiles` table: `select("id, coach_id, full_name, avatar_url").eq("id", viewerId).single()`
- Returns the profile row (not a react-query hook — a plain async function wrapped in `useMutation` for on-demand triggering)

#### 2. Make ViewersPanel rows clickable (`ActiveStoriesDialog.tsx`)
- Refactor `ViewersPanel` to accept an `onViewerClick(viewer)` callback prop
- Each viewer row gets `cursor-pointer hover:bg-white/10 rounded-md transition-colors`
- Parent component handles the click:
  - Call `checkViewerStatus.mutateAsync(viewerId)`
  - If `coach_id === user.id` → `navigate(`/athletes/${viewerId}`)`, close dialogs
  - If `coach_id !== null && coach_id !== user.id` → `toast.error("Bu kişi başka bir koça bağlı.")`
  - If `coach_id === null` → `setSelectedLead({ id, fullName, avatarUrl })`

#### 3. Build inline Invitation Dialog (inside `ActiveStoriesDialog.tsx`)
- Third `Dialog` at the bottom of the component (keeps it simple, no new file needed)
- Shows lead's avatar + name
- "Koçluk Daveti Gönder" primary button
- On click: `toast.success("${name} adlı kullanıcıya davet gönderildi!")`, close modal
- State: `selectedLead: { id, fullName, avatarUrl } | null`

### Files

| File | Action |
|------|--------|
| `src/hooks/useSocialMutations.ts` | MODIFY — add `useCheckViewerStatus` mutation |
| `src/components/content-studio/ActiveStoriesDialog.tsx` | MODIFY — clickable rows, status routing, invitation dialog |

