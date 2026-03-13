import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExerciseLibraryEntry {
  name: string;
  video_url: string | null;
  category: string | null;
  target_muscle: string | null;
}

async function fetchAllExercises(): Promise<ExerciseLibraryEntry[]> {
  const PAGE_SIZE = 1000;
  const all: ExerciseLibraryEntry[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("exercise_library")
      .select("name, video_url, category, target_muscle")
      .range(from, to);

    if (error) throw error;

    if (data && data.length > 0) {
      all.push(...data);
    }

    hasMore = (data?.length ?? 0) === PAGE_SIZE;
    page++;
  }

  return all;
}

export function useValidExercises() {
  const { data: exerciseLibrary = [], ...rest } = useQuery({
    queryKey: ["valid-exercise-names"],
    queryFn: fetchAllExercises,
    staleTime: 5 * 60 * 1000,
  });

  const validExerciseNames = exerciseLibrary.map((e) => e.name);

  // Build a lookup map: lowercase name -> entry
  const exerciseLookup = new Map<string, ExerciseLibraryEntry>();
  for (const entry of exerciseLibrary) {
    exerciseLookup.set(entry.name.toLowerCase(), entry);
  }

  return { validExerciseNames, exerciseLibrary, exerciseLookup, ...rest };
}
