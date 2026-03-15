import { supabase } from "@/integrations/supabase/client";

export interface AiAction {
  type: "supplement" | "program" | "message" | "nutrition";
  label: string;
  payload: string;
  completed?: boolean;
  is_quantitative?: boolean;
}

export interface ActionResult {
  success: boolean;
  updatedActions: AiAction[];
  isFullyResolved: boolean;
}

/** Math helper: scale a numeric value by percentage, minimum 1 */
const applyMutation = (val: number, pct: number): number =>
  Math.max(1, Math.round(val * (1 + pct / 100)));

/**
 * Parse and mutate a reps text field.
 * Supports: "10", "8-12", "10-12-15" (drop sets), "AMRAP", "Max" etc.
 * Non-numeric tokens are preserved as-is.
 */
const mutateReps = (reps: string | null, pct: number): string | null => {
  if (!reps) return reps;
  return reps
    .split("-")
    .map((part) => {
      const trimmed = part.trim();
      const num = parseInt(trimmed, 10);
      if (isNaN(num)) return trimmed; // preserve "AMRAP", "Max", etc.
      return String(applyMutation(num, pct));
    })
    .join("-");
};

/**
 * Deep-clone & mutate the athlete's active PROGRAM.
 * Hierarchy: programs → exercises (direct FK via program_id)
 * Includes orphan-prevention rollback on failure.
 */
async function forkAndMutateProgram(
  athleteId: string,
  coachId: string,
  mutationPercentage: number,
  insightId: string
): Promise<void> {
  // Step A: Fetch active program ID from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_program_id")
    .eq("id", athleteId)
    .single();

  if (!profile?.active_program_id) {
    // No active program — send directive notification only
    await supabase.from("athlete_notifications").insert({
      athlete_id: athleteId,
      coach_id: coachId,
      title: "Program Güncellendi",
      message: "Aktif program bulunamadığı için değişiklik direktif olarak iletildi.",
      type: "program",
      source_insight_id: insightId,
      metadata: { mutation_percentage: mutationPercentage },
    } as any);
    return;
  }

  const sourceProgramId = profile.active_program_id;

  // Step B: Fetch source program
  const { data: sourceProgram } = await supabase
    .from("programs")
    .select("*")
    .eq("id", sourceProgramId)
    .single();

  if (!sourceProgram) throw new Error("Source program not found");

  // Step C: Clone program row
  const { data: clonedProgram, error: cloneErr } = await supabase
    .from("programs")
    .insert({
      title: `${sourceProgram.title} (AI Optimizasyonu)`,
      description: sourceProgram.description,
      difficulty: sourceProgram.difficulty,
      target_goal: sourceProgram.target_goal,
      week_config: sourceProgram.week_config,
      automation_rules: sourceProgram.automation_rules,
      is_template: false,
      athlete_id: athleteId,
      coach_id: coachId,
      parent_program_id: sourceProgramId,
    } as any)
    .select("id")
    .single();

  if (cloneErr || !clonedProgram) throw new Error(`Program clone failed: ${cloneErr?.message}`);

  const newProgramId = clonedProgram.id;

  try {
    // Step D: Fetch & clone exercises with mutation
    const { data: sourceExercises, error: exFetchErr } = await supabase
      .from("exercises")
      .select("*")
      .eq("program_id", sourceProgramId)
      .order("order_index", { ascending: true });

    if (exFetchErr) throw new Error(`Exercise fetch failed: ${exFetchErr.message}`);

    if (sourceExercises && sourceExercises.length > 0) {
      const clonedExercises = sourceExercises.map((ex) => ({
        name: ex.name,
        program_id: newProgramId,
        sets: ex.sets ? applyMutation(ex.sets, mutationPercentage) : ex.sets,
        reps: ex.reps, // text field — preserved as-is
        rir: ex.rir,
        rir_per_set: ex.rir_per_set,
        failure_set: ex.failure_set,
        rest_time: ex.rest_time,
        order_index: ex.order_index,
        notes: ex.notes,
        video_url: ex.video_url,
      }));

      const { error: exInsertErr } = await supabase
        .from("exercises")
        .insert(clonedExercises as any);

      if (exInsertErr) throw new Error(`Exercise clone failed: ${exInsertErr.message}`);
    }

    // Step E: Assign new program to athlete
    const { error: assignErr } = await supabase
      .from("profiles")
      .update({ active_program_id: newProgramId } as any)
      .eq("id", athleteId);

    if (assignErr) throw new Error(`Profile assignment failed: ${assignErr.message}`);

    // Step F: Success notification
    const sign = mutationPercentage > 0 ? "+" : "";
    await supabase.from("athlete_notifications").insert({
      athlete_id: athleteId,
      coach_id: coachId,
      title: "Program AI Tarafından Güncellendi",
      message: `Programınız "${sourceProgram.title}" klonlandı ve hacim ${sign}${mutationPercentage}% güncellendi.`,
      type: "program",
      source_insight_id: insightId,
      metadata: { mutation_percentage: mutationPercentage, forked_from: sourceProgramId, forked_to: newProgramId },
    } as any);
  } catch (err) {
    // ROLLBACK: delete orphaned cloned program (cascade will clean exercises via FK)
    await supabase.from("programs").delete().eq("id", newProgramId);
    throw err;
  }
}

/**
 * Deep-clone & mutate the athlete's active NUTRITION plan.
 * Hierarchy: diet_templates → diet_template_foods (FK via template_id)
 * Includes orphan-prevention rollback on failure.
 */
async function forkAndMutateNutrition(
  athleteId: string,
  coachId: string,
  mutationPercentage: number,
  insightId: string
): Promise<void> {
  // Step A: Fetch active diet template from nutrition_targets
  const { data: target } = await supabase
    .from("nutrition_targets")
    .select("id, active_diet_template_id")
    .eq("athlete_id", athleteId)
    .eq("coach_id", coachId)
    .maybeSingle();

  if (!target?.active_diet_template_id) {
    await supabase.from("athlete_notifications").insert({
      athlete_id: athleteId,
      coach_id: coachId,
      title: "Beslenme Planı Güncellendi",
      message: "Aktif beslenme planı bulunamadığı için değişiklik direktif olarak iletildi.",
      type: "nutrition",
      source_insight_id: insightId,
      metadata: { mutation_percentage: mutationPercentage },
    } as any);
    return;
  }

  const sourceTemplateId = target.active_diet_template_id;

  // Step B: Fetch source template
  const { data: sourceTemplate } = await supabase
    .from("diet_templates")
    .select("*")
    .eq("id", sourceTemplateId)
    .single();

  if (!sourceTemplate) throw new Error("Source diet template not found");

  // Step C: Clone template row with mutated target_calories
  const { data: clonedTemplate, error: cloneErr } = await supabase
    .from("diet_templates")
    .insert({
      title: `${sourceTemplate.title} (AI Optimizasyonu)`,
      description: sourceTemplate.description,
      target_calories: sourceTemplate.target_calories
        ? applyMutation(sourceTemplate.target_calories, mutationPercentage)
        : sourceTemplate.target_calories,
      is_template: false,
      athlete_id: athleteId,
      coach_id: coachId,
      parent_template_id: sourceTemplateId,
    } as any)
    .select("id")
    .single();

  if (cloneErr || !clonedTemplate) throw new Error(`Diet template clone failed: ${cloneErr?.message}`);

  const newTemplateId = clonedTemplate.id;

  try {
    // Step D: Fetch & clone foods with mutation
    const { data: sourceFoods, error: foodFetchErr } = await supabase
      .from("diet_template_foods")
      .select("*")
      .eq("template_id", sourceTemplateId);

    if (foodFetchErr) throw new Error(`Food fetch failed: ${foodFetchErr.message}`);

    if (sourceFoods && sourceFoods.length > 0) {
      const clonedFoods = sourceFoods.map((f) => ({
        template_id: newTemplateId,
        meal_type: f.meal_type,
        food_name: f.food_name,
        serving_size: f.serving_size,
        day_number: f.day_number,
        calories: f.calories ? applyMutation(f.calories, mutationPercentage) : f.calories,
        protein: f.protein ? applyMutation(Number(f.protein), mutationPercentage) : f.protein,
        carbs: f.carbs ? applyMutation(Number(f.carbs), mutationPercentage) : f.carbs,
        fat: f.fat ? applyMutation(Number(f.fat), mutationPercentage) : f.fat,
      }));

      const { error: foodInsertErr } = await supabase
        .from("diet_template_foods")
        .insert(clonedFoods as any);

      if (foodInsertErr) throw new Error(`Food clone failed: ${foodInsertErr.message}`);
    }

    // Step E: Update nutrition_targets to point to new template
    const { error: assignErr } = await supabase
      .from("nutrition_targets")
      .update({ active_diet_template_id: newTemplateId } as any)
      .eq("id", target.id);

    if (assignErr) throw new Error(`Nutrition target assignment failed: ${assignErr.message}`);

    // Step F: Success notification
    const sign = mutationPercentage > 0 ? "+" : "";
    await supabase.from("athlete_notifications").insert({
      athlete_id: athleteId,
      coach_id: coachId,
      title: "Beslenme Planı AI Tarafından Güncellendi",
      message: `Beslenme planınız "${sourceTemplate.title}" klonlandı ve makrolar ${sign}${mutationPercentage}% güncellendi.`,
      type: "nutrition",
      source_insight_id: insightId,
      metadata: { mutation_percentage: mutationPercentage, forked_from: sourceTemplateId, forked_to: newTemplateId },
    } as any);
  } catch (err) {
    // ROLLBACK: delete orphaned cloned template (cascade will clean foods via FK)
    await supabase.from("diet_templates").delete().eq("id", newTemplateId);
    throw err;
  }
}

/**
 * Encapsulated AI Action Execution Engine.
 * Handles BOTH the real DB mutation AND the ai_weekly_analyses JSONB state update
 * in a single call to prevent ghost actions / partial state.
 */
export async function executeAiAction(
  athleteId: string,
  coachId: string,
  action: AiAction,
  insightId: string,
  currentActions: AiAction[],
  mutationPercentage?: number
): Promise<ActionResult> {
  const hasMutation = mutationPercentage !== undefined && mutationPercentage !== null;
  const metadata = hasMutation ? { mutation_percentage: mutationPercentage } : {};

  // 1. Execute the real backend mutation based on action type
  switch (action.type) {
    case "supplement": {
      // Idempotency: check if already assigned & active
      const { data: existing } = await supabase
        .from("assigned_supplements")
        .select("id")
        .eq("athlete_id", athleteId)
        .eq("name_and_dosage", action.label)
        .eq("is_active", true)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from("assigned_supplements").insert({
          athlete_id: athleteId,
          coach_id: coachId,
          name_and_dosage: action.label,
          source_insight_id: insightId,
        });
        if (error) throw new Error(`Supplement insert failed: ${error.message}`);
      }

      // Notify athlete
      const { error: notifErr } = await supabase.from("athlete_notifications").insert({
        athlete_id: athleteId,
        coach_id: coachId,
        title: "Yeni Takviye Eklendi",
        message: action.payload || action.label,
        type: "supplement",
        source_insight_id: insightId,
      } as any);
      if (notifErr) throw new Error(`Notification insert failed: ${notifErr.message}`);
      break;
    }

    case "message": {
      const { error } = await supabase.from("athlete_notifications").insert({
        athlete_id: athleteId,
        coach_id: coachId,
        title: "Koçunuzdan Mesaj",
        message: action.payload || action.label,
        type: "message",
        source_insight_id: insightId,
      } as any);
      if (error) throw new Error(`Notification insert failed: ${error.message}`);
      break;
    }

    case "program": {
      // Quantitative fork & mutate
      if (hasMutation && mutationPercentage !== 0) {
        await forkAndMutateProgram(athleteId, coachId, mutationPercentage!, insightId);
      } else {
        // Qualitative directive — notification only
        const { error } = await supabase.from("athlete_notifications").insert({
          athlete_id: athleteId,
          coach_id: coachId,
          title: "Program Güncellendi",
          message: action.payload || action.label,
          type: "program",
          source_insight_id: insightId,
          metadata,
        } as any);
        if (error) throw new Error(`Notification insert failed: ${error.message}`);
      }
      break;
    }

    case "nutrition": {
      // Quantitative fork & mutate
      if (hasMutation && mutationPercentage !== 0) {
        await forkAndMutateNutrition(athleteId, coachId, mutationPercentage!, insightId);
      } else {
        // Qualitative directive — notification only
        const { error } = await supabase.from("athlete_notifications").insert({
          athlete_id: athleteId,
          coach_id: coachId,
          title: "Beslenme Planı Güncellendi",
          message: action.payload || action.label,
          type: "nutrition",
          source_insight_id: insightId,
          metadata,
        } as any);
        if (error) throw new Error(`Notification insert failed: ${error.message}`);
      }
      break;
    }

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }

  // 2. Update the JSONB state atomically
  const updatedActions = currentActions.map((a) =>
    a.label === action.label ? { ...a, completed: true } : a
  );
  const isFullyResolved = updatedActions.every((a) => a.completed);

  const { error: updateErr } = await supabase
    .from("ai_weekly_analyses")
    .update({ actions: updatedActions, resolved: isFullyResolved } as any)
    .eq("id", insightId);

  if (updateErr) throw new Error(`JSONB state update failed: ${updateErr.message}`);

  return { success: true, updatedActions, isFullyResolved };
}
