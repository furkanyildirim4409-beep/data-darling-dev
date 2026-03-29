import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

/**
 * Generate concrete assigned_diet_days rows for the given athlete assignment.
 * Uses the same architecture as workout assignments:
 * - startDate is guaranteed to be a Monday
 * - day_number mapping: (i % 7) + 1 → 1=Mon … 7=Sun
 * - Only days with actual food in the template get rows
 * - Chunked upsert (500 rows/batch)
 */
export async function generateAssignedDietDays(
  athleteId: string,
  coachId: string,
  templateId: string,
  startDate: Date,
  durationWeeks: number
): Promise<{ error: string | null }> {
  // 1. Fetch which day_numbers actually have food in the template
  const { data: foods, error: fetchError } = await supabase
    .from("diet_template_foods")
    .select("day_number")
    .eq("template_id", templateId);

  if (fetchError) {
    return { error: fetchError.message };
  }

  const populatedDays = new Set((foods || []).map(f => f.day_number || 1));

  // 2. Build rows — startDate is guaranteed Monday, so i=0 → Day 1 (Mon)
  const totalDays = durationWeeks * 7;
  const rows: {
    athlete_id: string;
    coach_id: string;
    template_id: string;
    target_date: string;
    day_number: number;
  }[] = [];

  for (let i = 0; i < totalDays; i++) {
    const templateDayNumber = (i % 7) + 1; // 1=Mon, 2=Tue, ..., 7=Sun

    if (populatedDays.has(templateDayNumber)) {
      rows.push({
        athlete_id: athleteId,
        coach_id: coachId,
        template_id: templateId,
        target_date: format(addDays(startDate, i), "yyyy-MM-dd"),
        day_number: templateDayNumber,
      });
    }
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
