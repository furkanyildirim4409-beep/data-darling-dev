

## Restrict Sub-Coach Permissions: Hide Add Athlete and Invite Buttons

### Problem
Sub-coaches can currently see and use "Sporcu Bagla" (Link Athlete), "Davet Linki" (Invite Link), and the "Kocluk Daveti Gonder" (Send Coaching Invite) button in ActiveStoriesDialog. These roster-management actions should be exclusive to the head coach.

### Plan

#### 1. Athletes page (`src/pages/Athletes.tsx`)
- Wrap both the "Davet Linki" Dialog (lines 131-170) and the "Sporcu Bagla" Dialog (lines 173-210) in `{!isSubCoach && (...)}` blocks
- `isSubCoach` is already destructured from `useAuth()` on line 16 -- no new imports needed

#### 2. ActiveStoriesDialog (`src/components/content-studio/ActiveStoriesDialog.tsx`)
- Import `useAuth` (already imported on line 14) and destructure `isSubCoach`
- In `handleViewerClick`: when `coach_id === null` (free lead), only open the invitation modal if `!isSubCoach`. Otherwise show an info toast ("Bu islemi yalnizca ana koc yapabilir.")
- Alternatively, simply hide the invitation dialog render when `isSubCoach` is true

### Files

| File | Action |
|------|--------|
| `src/pages/Athletes.tsx` | MODIFY -- wrap invite link + link athlete buttons in `{!isSubCoach && ...}` |
| `src/components/content-studio/ActiveStoriesDialog.tsx` | MODIFY -- gate lead invitation flow behind `!isSubCoach` |

