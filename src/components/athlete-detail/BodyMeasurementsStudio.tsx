import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Ruler, User as UserIcon, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  athleteId: string;
}

interface Measurement {
  id: string;
  logged_at: string | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  arm: number | null;
  thigh: number | null;
  neck: number | null;
  shoulder: number | null;
  body_fat_pct: number | null;
}

interface PhotoRow {
  id: string;
  date: string;
  photo_url: string;
}

type MetricKey = "chest" | "waist" | "hips" | "arm" | "thigh" | "neck" | "shoulder" | "body_fat_pct";

const METRICS: { key: MetricKey; label: string; unit: string; lowerIsBetter: boolean }[] = [
  { key: "chest", label: "Göğüs", unit: "cm", lowerIsBetter: false },
  { key: "shoulder", label: "Omuz", unit: "cm", lowerIsBetter: false },
  { key: "arm", label: "Kol", unit: "cm", lowerIsBetter: false },
  { key: "waist", label: "Bel", unit: "cm", lowerIsBetter: true },
  { key: "hips", label: "Kalça", unit: "cm", lowerIsBetter: false },
  { key: "thigh", label: "Bacak", unit: "cm", lowerIsBetter: false },
  { key: "neck", label: "Boyun", unit: "cm", lowerIsBetter: false },
  { key: "body_fat_pct", label: "Yağ %", unit: "%", lowerIsBetter: true },
];

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BodyMeasurementsStudio({ athleteId }: Props) {
  const [rows, setRows] = useState<Measurement[]>([]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [m, p] = await Promise.all([
      supabase
        .from("body_measurements")
        .select("id,logged_at,chest,waist,hips,arm,thigh,neck,shoulder,body_fat_pct")
        .eq("user_id", athleteId)
        .order("logged_at", { ascending: false }),
      supabase
        .from("progress_photos")
        .select("id,date,photo_url")
        .eq("user_id", athleteId)
        .order("date", { ascending: false }),
    ]);
    const ms = (m.data ?? []) as Measurement[];
    setRows(ms);
    setPhotos((p.data ?? []) as PhotoRow[]);
    setSelectedId((prev) => prev ?? ms[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
    const ch = supabase
      .channel(`bms-${athleteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "body_measurements", filter: `user_id=eq.${athleteId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "progress_photos", filter: `user_id=eq.${athleteId}` },
        () => fetchData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId]
  );
  const baseline = rows[rows.length - 1] ?? null;

  // Resolve photo for selected date
  useEffect(() => {
    let cancelled = false;
    setPhotoSignedUrl(null);
    if (!selected?.logged_at || photos.length === 0) return;
    const target = new Date(selected.logged_at).getTime();
    // Closest photo by absolute distance
    const closest = [...photos].sort(
      (a, b) =>
        Math.abs(new Date(a.date).getTime() - target) -
        Math.abs(new Date(b.date).getTime() - target)
    )[0];
    if (!closest) return;

    const raw = closest.photo_url;
    if (!raw) return;
    if (raw.startsWith("http")) {
      setPhotoSignedUrl(raw);
      return;
    }
    const path = raw.replace(/^progress-photos\//, "");
    supabase.storage
      .from("progress-photos")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setPhotoSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, photos]);

  if (loading) {
    return (
      <div className="glass rounded-xl border border-border p-5 h-full">
        <div className="h-56 animate-pulse bg-secondary/30 rounded-lg" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="glass rounded-xl border border-border p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Ruler className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Vücut Ölçüm Stüdyosu</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Henüz ölçüm kaydı bulunmuyor.
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl border border-border p-5 h-full">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Ruler className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground truncate">
            Vücut Ölçüm Stüdyosu
          </h3>
        </div>
        <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
          <SelectTrigger className="w-[170px] h-8 text-xs bg-background/40 border-border">
            <SelectValue placeholder="Tarih seç" />
          </SelectTrigger>
          <SelectContent>
            {rows.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-xs">
                {formatDate(r.logged_at)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: progress photo */}
        <div className="aspect-[3/4] rounded-lg bg-gradient-to-br from-secondary/40 to-background/60 border border-border overflow-hidden relative">
          {photoSignedUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img
              src={photoSignedUrl}
              alt="İlerleme fotoğrafı"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <UserIcon className="w-16 h-16 opacity-30" />
              <p className="text-xs">Bu tarih için fotoğraf yok</p>
            </div>
          )}
        </div>

        {/* Right: metrics ledger */}
        <div className="space-y-1.5">
          {METRICS.map((m) => {
            const v = selected?.[m.key];
            const b = baseline?.[m.key];
            const hasDelta =
              v !== null && v !== undefined && b !== null && b !== undefined && selected?.id !== baseline?.id;
            const delta = hasDelta ? Number(v) - Number(b) : null;
            const isFavorable =
              delta !== null && (m.lowerIsBetter ? delta < 0 : delta > 0);
            const isUnfavorable =
              delta !== null && delta !== 0 && !isFavorable;

            return (
              <div
                key={m.key}
                className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/30 border border-border/50"
              >
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground tabular-nums">
                    {v !== null && v !== undefined ? `${v}${m.unit}` : "-"}
                  </span>
                  {delta !== null && delta !== 0 ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded",
                        isFavorable && "bg-success/15 text-success",
                        isUnfavorable && "bg-destructive/15 text-destructive"
                      )}
                    >
                      {delta > 0 ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )}
                      {Math.abs(delta).toFixed(1)}
                      {m.unit}
                    </span>
                  ) : delta === 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">
                      <Minus className="w-3 h-3" />0
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground/70 pt-1 text-right">
            Farklar ilk ölçüme göre ({formatDate(baseline?.logged_at ?? null)})
          </p>
        </div>
      </div>
    </div>
  );
}
