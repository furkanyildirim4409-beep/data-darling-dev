import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type BannerValue = { active?: boolean; message?: string };

export function MaintenanceBanner() {
  const [data, setData] = useState<BannerValue | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: row } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "maintenance_banner")
        .maybeSingle();
      if (!cancelled && row?.value) setData(row.value as BannerValue);
    })();
    return () => { cancelled = true; };
  }, []);

  if (dismissed || !data?.active || !data.message) return null;

  return (
    <div className="w-full bg-primary text-primary-foreground px-4 py-2 flex items-center justify-center relative">
      <p className="text-sm font-medium text-center">{data.message}</p>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
        aria-label="Kapat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
