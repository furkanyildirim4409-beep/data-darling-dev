import { supabase } from "@/integrations/supabase/client";

export async function sendCheckinReminder(
  athleteId: string,
  coachId: string | null
): Promise<void> {
  const { error } = await supabase.from("athlete_notifications").insert({
    athlete_id: athleteId,
    coach_id: coachId,
    title: "Check-in Zamanı! ⚡",
    message: "Koçunuz form durumunuzu incelemek için check-in yapmanızı bekliyor.",
    type: "checkin_reminder",
    is_read: false,
  });
  if (error) throw error;

  try {
    await supabase.functions.invoke("send-chat-push", {
      body: {
        userId: athleteId,
        title: "Check-in Zamanı!",
        body: "Koçunuz form verilerinizi bekliyor.",
      },
    });
  } catch {
    // Silent failure tolerated if push is unconfigured for this athlete
  }
}
