

## Audio Player UI & Bugfix Sync — Plan

### Overview

Replace the basic `MiniAudioPlayer` (play/pause + static waveform) with a premium `CustomAudioPlayer` (progress bar, seek, timestamps) across all 3 chat surfaces, and fix the ChatWidget's missing audio rendering.

### Current State

- **`MiniAudioPlayer`** is defined inline in both `ActiveChat.tsx` and `QuickChatPopover.tsx` — basic toggle with fake waveform bars, no progress/seek
- **`ChatWidget.tsx`** renders images but has NO audio playback at all (missing audio case)
- **`useMediaUpload.ts`** already correctly passes `'audio'` type for recordings — the media_type bug does NOT exist in this codebase (recordings go through `uploadFile(blob, 'webm', 'audio')` directly)

### Changes

| File | Change |
|------|--------|
| `src/components/ui/CustomAudioPlayer.tsx` | **New file** — premium player with hidden `<audio>`, play/pause button, seekable progress bar, time display |
| `src/components/chat/ActiveChat.tsx` | Remove inline `MiniAudioPlayer`, import `CustomAudioPlayer`, use it at line 230 |
| `src/components/athletes/QuickChatPopover.tsx` | Remove inline `MiniAudioPlayer`, import `CustomAudioPlayer`, use it at line 368 |
| `src/components/athlete-detail/ChatWidget.tsx` | Add audio rendering: `{msg.media_type === "audio" && msg.media_url && <CustomAudioPlayer src={msg.media_url} />}` after the image block (line 264) |

### CustomAudioPlayer Component

Exact implementation as specified: rounded-full container, hidden `<audio>` element, circular play/pause button with `primary` colors, clickable progress bar with `bg-secondary` track and `bg-primary` fill, timestamps in `text-[9px]`. Handles `onEnded` to reset state.

### No media_type Bug Fix Needed

The `useMediaUpload` hook already hardcodes `'audio'` type when calling `uploadFile` from `startRecording`. The `handleImageSelect` function validates `file.type.startsWith('image/')`. There is no generic file upload path where `.webm` could be misclassified as an image.

