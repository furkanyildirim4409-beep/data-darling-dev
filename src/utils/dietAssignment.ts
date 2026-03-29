import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

/**
 * Generate concrete assigned_diet_days rows mapping each calendar date
 * to a template day_number for the given athlete assignment.
 *
 * Uses chunked upsert (500 rows/batch) to avoid payload limits.
 */
export async function generateAssignedDietDays(
  athleteId: string,
  coachId: string,
  templateId: string,
  startDate: Date,
  durationWeeks: number
): Promise<{ error: string | null }> {
  // 1. Determine how many unique day_numbers the template has
  const { data: dayNumbers } = await supabase
    .from("diet_template_foods")
    .select("day_number")
    .eq("template_id", templateId);

  const uniqueDays = new Set((dayNumbers || []).map((d) => d.day_number || 1));
  const templateDayCount = Math.max(uniqueDays.size, 1);

  // 2. Build rows
  const totalDays = durationWeeks * 7;
  const rows: {
    athlete_id: string;
    coach_id: string;
    template_id: string;
    target_date: string;
    day_number: number;
  }[] = [];

  for (let i = 0; i < totalDays; i++) {
    rows.push({
      athlete_id: athleteId,
      coach_id: coachId,
      template_id: templateId,
      target_date: format(addDays(startDate, i), "yyyy-MM-dd"),
      day_number: (i % templateDayCount) + 1,
    });
  }

  // 3. Delete existing rows from startDate onward for this athlete
  const { error: deleteError } = await supabase
    .from("assigned_diet_days")
    .delete()
    .eq("athlete_id", athleteId)
    .gte("target_date", format(startDate, "yyyy-MM-dd"));

  if (deleteError) {
    return { error: deleteError.message };
  }

  // 4. Chunked insert (500 per batch)
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("assigned_diet_days")
      .insert(chunk as any);

    if (error) {
      return { error: error.message };
    }
  }

  return { error: null };
}
