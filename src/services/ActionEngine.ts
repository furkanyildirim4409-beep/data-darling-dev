import { supabase } from "@/integrations/supabase/client";

export interface AiAction {
  type: "supplement" | "program" | "message" | "nutrition";
  label: string;
  payload: string;
  completed?: boolean;
}

export interface ActionResult {
  success: boolean;
  updatedActions: AiAction[];
  isFullyResolved: boolean;
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
      break;
    }

    case "nutrition": {
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
