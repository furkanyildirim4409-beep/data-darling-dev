

# Fix Athlete Routing URL in Push Payload

## Problem
`athleteUrl` points to `/?openChat=true` but the root route redirects to `/kokpit`, stripping query params.

## Change
**File: `supabase/functions/send-message-push/index.ts`** (line 85)

Change:
```typescript
athleteUrl: `/?openChat=true&coachId=${sender_id}`,
```
To:
```typescript
athleteUrl: `/kokpit?openChat=true&coachId=${sender_id}`,
```

Then deploy the function to Supabase.

