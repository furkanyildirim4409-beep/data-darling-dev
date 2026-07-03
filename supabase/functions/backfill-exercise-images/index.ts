import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// ExerciseDB rate limit: 120 req/min. Cron runs every 2 min → 240 req window.
// We process 120 items per invocation with a 500ms delay between requests
// (≈ 60s of work), which stays comfortably under the provider limit.
const BATCH_SIZE = 120;
const RESOLUTION = "1080";
const REQUEST_DELAY_MS = 500;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10; // 10 years

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractExerciseId(videoUrl: string | null): string | null {
  if (!videoUrl) return null;
  const m = videoUrl.match(/exerciseId=([^&]+)/);
  return m ? m[1] : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // No end-user auth: cron triggers this and the work is idempotent.
    // The function self-unschedules once every row is synced.



    const apiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!apiKey) return json({ error: "RAPIDAPI_KEY not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- Fetch a deterministic batch of pending rows ----
    const { data: pending, error: selectErr } = await supabase
      .from("exercise_library")
      .select("id, name, video_url")
      .is("image_synced_at", null)
      .order("name", { ascending: true })
      .limit(BATCH_SIZE);

    if (selectErr) {
      console.error("select error:", selectErr);
      return json({ error: selectErr.message }, 500);
    }

    if (!pending || pending.length === 0) {
      // Nothing left — remove the cron job.
      const { error: unschedErr } = await supabase.rpc("unschedule_backfill_exercise_images");
      if (unschedErr) console.error("unschedule error:", unschedErr);
      console.log("[backfill] complete. cron unscheduled.");
      return json({ status: "complete", processed: 0, pending: 0 });
    }

    let ok = 0;
    let fail = 0;

    for (const row of pending) {
      const exerciseId = extractExerciseId(row.video_url);
      if (!exerciseId) {
        await supabase
          .from("exercise_library")
          .update({
            image_sync_error: "could not extract exerciseId from video_url",
            image_synced_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        fail++;
        continue;
      }

      try {
        const rapidRes = await fetch(
          `https://exercisedb.p.rapidapi.com/image?exerciseId=${exerciseId}&resolution=${RESOLUTION}`,
          {
            headers: {
              "x-rapidapi-host": "exercisedb.p.rapidapi.com",
              "x-rapidapi-key": apiKey,
            },
          },
        );

        if (!rapidRes.ok) {
          const txt = await rapidRes.text();
          console.error(`[${exerciseId}] rapidapi ${rapidRes.status}: ${txt.slice(0, 120)}`);
          await supabase
            .from("exercise_library")
            .update({ image_sync_error: `rapidapi ${rapidRes.status}` })
            .eq("id", row.id);
          fail++;
          await sleep(REQUEST_DELAY_MS);
          continue;
        }

        const contentType = rapidRes.headers.get("content-type") || "image/gif";
        const buf = new Uint8Array(await rapidRes.arrayBuffer());
        const path = `${exerciseId}.gif`;

        const { error: uploadErr } = await supabase.storage
          .from("exercise-gifs")
          .upload(path, buf, {
            contentType,
            upsert: true,
            cacheControl: "31536000",
          });

        if (uploadErr) {
          console.error(`[${exerciseId}] upload error:`, uploadErr);
          await supabase
            .from("exercise_library")
            .update({ image_sync_error: `upload: ${uploadErr.message}` })
            .eq("id", row.id);
          fail++;
          await sleep(REQUEST_DELAY_MS);
          continue;
        }

        // Create a very-long-lived signed URL — usable directly in <img src>.
        const { data: signed, error: signErr } = await supabase.storage
          .from("exercise-gifs")
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

        if (signErr || !signed?.signedUrl) {
          console.error(`[${exerciseId}] sign error:`, signErr);
          await supabase
            .from("exercise_library")
            .update({ image_sync_error: `sign: ${signErr?.message || "no url"}` })
            .eq("id", row.id);
          fail++;
          await sleep(REQUEST_DELAY_MS);
          continue;
        }

        await supabase
          .from("exercise_library")
          .update({
            storage_path: path,
            video_url: signed.signedUrl,
            image_synced_at: new Date().toISOString(),
            image_sync_error: null,
          })
          .eq("id", row.id);

        ok++;
      } catch (err) {
        console.error(`[${exerciseId}] unexpected:`, err);
        await supabase
          .from("exercise_library")
          .update({ image_sync_error: `exception: ${(err as Error).message}` })
          .eq("id", row.id);
        fail++;
      }

      await sleep(REQUEST_DELAY_MS);
    }

    // Count remaining pending rows for reporting / self-termination.
    const { count: remaining } = await supabase
      .from("exercise_library")
      .select("*", { count: "exact", head: true })
      .is("image_synced_at", null);

    if ((remaining ?? 0) === 0) {
      const { error: unschedErr } = await supabase.rpc("unschedule_backfill_exercise_images");
      if (unschedErr) console.error("unschedule error:", unschedErr);
      console.log("[backfill] complete. cron unscheduled.");
    }

    console.log(`[backfill] ok=${ok} fail=${fail} remaining=${remaining ?? "?"}`);
    return json({ status: "ok", processed: pending.length, ok, fail, remaining });
  } catch (err) {
    console.error("backfill-exercise-images error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
