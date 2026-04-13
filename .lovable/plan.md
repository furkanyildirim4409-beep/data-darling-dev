

## Upgrade Stories to Highlight Categories

### Step A: Database Migration

Add a `category` column to `coach_stories`:

```sql
ALTER TABLE coach_stories ADD COLUMN category text;
```

This is a nullable text column — no default needed since existing stories simply won't have a category.

### Step B: Update Mutation Hook (`src/hooks/useSocialMutations.ts`)

- Add `category?: string` to `CreateStoryPayload`
- Include `category: payload.category ?? null` in the insert call

### Step C: Wire Up Content Studio (`src/components/content-studio/StoryUploadModal.tsx`)

- Pass `category: selectedCategory` (the category name, not ID) to the `createStory` call
- Map category ID to name before passing (using the existing `categories` array)

### Execution Order

Per your request: I will first create the migration with the ALTER TABLE statement. Once confirmed, I will proceed with the code changes in Steps B and C.

### Files

| File | Action |
|------|--------|
| Migration SQL | NEW — add `category` column |
| `src/hooks/useSocialMutations.ts` | MODIFY — accept and insert category |
| `src/components/content-studio/StoryUploadModal.tsx` | MODIFY — pass category to mutation |

