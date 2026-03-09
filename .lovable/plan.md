

# Fix: RapidAPI Fetch URL & Error Handling

## Changes — `ExerciseLibraryEditor.tsx`

### 1. Remove `&offset=0` from fetch URL (line 125)
```
- `https://exercisedb.p.rapidapi.com/exercises?limit=${clampedLimit}&offset=0`
+ `https://exercisedb.p.rapidapi.com/exercises?limit=${clampedLimit}`
```

### 2. Reorder headers to match cURL spec (lines 128-130)
Put `x-rapidapi-host` first, `x-rapidapi-key` second. Cosmetic but matches spec exactly.

### 3. Replace generic error throw with detailed logging (line 134)
```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error("RapidAPI Error:", errorText);
  throw new Error(`API Hatası (${response.status}): Lütfen konsolu kontrol edin.`);
}
```

All three changes are in `handleImport`, lines 124-134. Single surgical edit.

