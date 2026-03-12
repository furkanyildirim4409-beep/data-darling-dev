import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchAllExerciseNames(): Promise<string[]> {
  const PAGE_SIZE = 1000;
  const allNames: string[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("exercise_library")
      .select("name")
      .range(from, to);

    if (error) throw error;

    if (data && data.length > 0) {
      allNames.push(...data.map((row) => row.name));
    }

    hasMore = (data?.length ?? 0) === PAGE_SIZE;
    page++;
  }

  return allNames;
}

export function useValidExercises() {
  const { data: validExerciseNames = [], ...rest } = useQuery({
    queryKey: ["valid-exercise-names"],
    queryFn: fetchAllExerciseNames,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { validExerciseNames, ...rest };
}
