import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Apple, Calendar, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActiveBlocksProps {
  athleteId: string;
}

interface TrainingData {
  programName: string;
  description: string | null;
  startDate: string | null;
  totalDays: number;
  elapsedDays: number;
}

interface DietData {
  templateName: string;
  description: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function ActiveBlocks({ athleteId }: ActiveBlocksProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [training, setTraining] = useState<TrainingData | null>(null);
  const [diet, setDiet] = useState<DietData | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // Fetch active program from profile
    const [profileRes, nutritionRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("active_program_id")
        .eq("id", athleteId)
        .maybeSingle(),
      supabase
        .from("nutrition_targets")
        .select("active_diet_template_id, daily_calories, protein_g, carbs_g, fat_g")
        .eq("athlete_id", athleteId)
        .maybeSingle(),
    ]);

    // Training block
    const programId = profileRes.data?.active_program_id;
    if (programId) {
      const [programRes, workoutsRes] = await Promise.all([
        supabase.from("programs").select("title, description, created_at").eq("id", programId).maybeSingle(),
        supabase.from("assigned_workouts").select("scheduled_date").eq("athlete_id", athleteId).eq("program_id", programId).order("scheduled_date", { ascending: true }),
      ]);

      if (programRes.data) {
        const dates = (workoutsRes.data || [])
          .map((w) => w.scheduled_date)
          .filter(Boolean)
          .sort();
        const startDate = dates[0] || programRes.data.created_at?.slice(0, 10) || null;
        const endDate = dates[dates.length - 1] || null;

        let totalDays = 56; // default 8 weeks
        let elapsedDays = 0;

        if (startDate && endDate) {
          totalDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
          elapsedDays = Math.max(0, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000));
        } else if (startDate) {
          elapsedDays = Math.max(0, Math.ceil((Date.now() - new Date(startDate).getTime()) / 86400000));
        }

        setTraining({
          programName: programRes.data.title,
          description: programRes.data.description,
          startDate,
          totalDays,
          elapsedDays: Math.min(elapsedDays, totalDays),
        });
      }
    } else {
      setTraining(null);
    }

    // Diet block
    const templateId = nutritionRes.data?.active_diet_template_id;
    if (templateId) {
      const tplRes = await supabase
        .from("diet_templates")
        .select("title, description")
        .eq("id", templateId)
        .maybeSingle();

      setDiet({
        templateName: tplRes.data?.title || "Beslenme Planı",
        description: tplRes.data?.description || null,
        calories: nutritionRes.data?.daily_calories || 0,
        protein: nutritionRes.data?.protein_g || 0,
        carbs: nutritionRes.data?.carbs_g || 0,
        fat: nutritionRes.data?.fat_g || 0,
      });
    } else if (nutritionRes.data) {
      // Has targets but no template
      setDiet({
        templateName: "Özel Hedefler",
        description: null,
        calories: nutritionRes.data.daily_calories || 0,
        protein: nutritionRes.data.protein_g || 0,
        carbs: nutritionRes.data.carbs_g || 0,
        fat: nutritionRes.data.fat_g || 0,
      });
    } else {
      setDiet(null);
    }

    setIsLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  const currentWeek = training ? Math.max(1, Math.ceil(training.elapsedDays / 7)) : 0;
  const totalWeeks = training ? Math.max(1, Math.ceil(training.totalDays / 7)) : 1;
  const progressPct = training ? Math.min(100, Math.round((training.elapsedDays / training.totalDays) * 100)) : 0;

  return (
    <div className="space-y-4">
      {/* Training Block */}
      <div className="glass rounded-xl border border-border p-4 hover:border-primary/30 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {training ? training.programName : "Program Yok"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {training?.description || (training ? "Aktif program" : "Henüz program atanmadı")}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        {training ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                Hafta {currentWeek}/{totalWeeks}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">İlerleme</span>
                <span className="font-mono text-foreground">%{progressPct}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Antrenman Programı sekmesinden bir program atayabilirsiniz.
          </p>
        )}
      </div>

      {/* Diet Block */}
      <div className="glass rounded-xl border border-border p-4 hover:border-success/30 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Apple className="w-5 h-5 text-success" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {diet ? diet.templateName : "Beslenme Planı Yok"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {diet?.description || (diet ? "Aktif beslenme planı" : "Henüz beslenme planı atanmadı")}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-success transition-colors" />
        </div>

        {diet ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-lg bg-secondary/50 text-center">
              <p className="text-lg font-bold font-mono text-foreground">{diet.calories}</p>
              <p className="text-[10px] text-muted-foreground">kcal/gün</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50 text-center">
              <p className="text-lg font-bold font-mono text-foreground">{diet.protein}g</p>
              <p className="text-[10px] text-muted-foreground">protein</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Beslenme Planı sekmesinden bir şablon atayabilirsiniz.
          </p>
        )}
      </div>
    </div>
  );
}
