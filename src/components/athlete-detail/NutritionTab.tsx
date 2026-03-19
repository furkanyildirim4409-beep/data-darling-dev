import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { AssignDietTemplateDialog } from "./AssignDietTemplateDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Apple, Edit, Flame, Beef, Wheat, Droplets, Save, X, Loader2, UtensilsCrossed, TrendingUp, ChevronDown, ChevronUp, CalendarIcon, FileDown, Check, AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAthleteNutritionHistory, type ConsumedFood, type DateRange, type UnifiedFoodItem } from "@/hooks/useAthleteNutritionHistory";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface NutritionTabProps {
  athleteId: string;
  currentDiet: string;
  calories: number;
  protein: number;
}

interface NutritionTargets {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const DEFAULT_TARGETS: NutritionTargets = {
  daily_calories: 2000,
  protein_g: 150,
  carbs_g: 250,
  fat_g: 70,
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "☀️ Kahvaltı",
  lunch: "🍽️ Öğle Yemeği",
  dinner: "🌙 Akşam Yemeği",
  snack: "🍎 Atıştırmalık",
};

interface ActiveTemplate {
  templateId: string;
  title: string;
  dailyAvg: { calories: number; protein: number; carbs: number; fat: number };
}

export function NutritionTab({ athleteId }: NutritionTabProps) {
  // ─── Target State ───
  const [targets, setTargets] = useState<NutritionTargets>(DEFAULT_TARGETS);
  const [formValues, setFormValues] = useState<NutritionTargets>(DEFAULT_TARGETS);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ActiveTemplate | null>(null);
  const [removingTemplate, setRemovingTemplate] = useState(false);

  // ─── History State ───
  const RANGE_PRESETS = [
    { label: "7 Gün", days: 7 },
    { label: "14 Gün", days: 14 },
    { label: "30 Gün", days: 30 },
  ];
  const [activePreset, setActivePreset] = useState(7);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [customRange, setCustomRange] = useState(false);

  const { dailyData, isLoading: historyLoading, calorieTarget, averageAdherence, macroAverages } =
    useAthleteNutritionHistory(athleteId, dateRange);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handlePreset = (days: number) => {
    setActivePreset(days);
    setCustomRange(false);
    setDateRange({ from: subDays(new Date(), days - 1), to: new Date() });
    setSelectedDate(null);
  };

  // ─── Fetch Targets + Assignments ───
  const fetchTargets = useCallback(async () => {
    setIsLoading(true);
    const targetsRes = await supabase
      .from("nutrition_targets")
      .select("daily_calories, protein_g, carbs_g, fat_g, active_diet_template_id")
      .eq("athlete_id", athleteId)
      .maybeSingle();

    if (targetsRes.data) {
      const t: NutritionTargets = {
        daily_calories: targetsRes.data.daily_calories,
        protein_g: targetsRes.data.protein_g,
        carbs_g: targetsRes.data.carbs_g,
        fat_g: targetsRes.data.fat_g,
      };
      setTargets(t);
      setFormValues(t);
      setHasExisting(true);

      // Fetch active template details if set
      const activeId = targetsRes.data.active_diet_template_id;
      if (activeId) {
        const [tplRes, foodsRes] = await Promise.all([
          supabase.from("diet_templates").select("id, title").eq("id", activeId).maybeSingle(),
          supabase.from("diet_template_foods").select("calories, protein, carbs, fat, day_number").eq("template_id", activeId),
        ]);

        if (tplRes.data) {
          const foods = foodsRes.data || [];
          const daySet = new Set(foods.map((f) => f.day_number || 1));
          const numDays = daySet.size || 1;
          const totals = foods.reduce(
            (acc, f) => ({
              cal: acc.cal + (Number(f.calories) || 0),
              pro: acc.pro + (Number(f.protein) || 0),
              carb: acc.carb + (Number(f.carbs) || 0),
              fat: acc.fat + (Number(f.fat) || 0),
            }),
            { cal: 0, pro: 0, carb: 0, fat: 0 }
          );
          setActiveTemplate({
            templateId: tplRes.data.id,
            title: tplRes.data.title,
            dailyAvg: {
              calories: Math.round(totals.cal / numDays),
              protein: Math.round(totals.pro / numDays),
              carbs: Math.round(totals.carb / numDays),
              fat: Math.round(totals.fat / numDays),
            },
          });
        } else {
          setActiveTemplate(null);
        }
      } else {
        setActiveTemplate(null);
      }
    } else {
      setHasExisting(false);
      setActiveTemplate(null);
    }

    setIsLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Hata", description: "Oturum bulunamadı.", variant: "destructive" });
      setIsSaving(false);
      return;
    }
    const { error } = await supabase
      .from("nutrition_targets")
      .upsert(
        {
          athlete_id: athleteId,
          coach_id: user.id,
          daily_calories: formValues.daily_calories,
          protein_g: formValues.protein_g,
          carbs_g: formValues.carbs_g,
          fat_g: formValues.fat_g,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "athlete_id" }
      );
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      setTargets(formValues);
      setHasExisting(true);
      setIsEditing(false);
      toast({ title: "Başarılı", description: "Beslenme hedefleri kaydedildi." });
    }
    setIsSaving(false);
  };

  const handleRemoveTemplate = async () => {
    setRemovingTemplate(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRemovingTemplate(false); return; }
    const { error } = await supabase
      .from("nutrition_targets")
      .update({ active_diet_template_id: null, updated_at: new Date().toISOString() })
      .eq("athlete_id", athleteId)
      .eq("coach_id", user.id);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Beslenme programı kaldırıldı." });
      await fetchTargets();
    }
    setRemovingTemplate(false);
  };

  const handleCancel = () => {
    setFormValues(targets);
    setIsEditing(false);
  };

  // ─── Combined macro totals from all assigned templates ───
  const activeMacros = useMemo(() => {
    if (!activeTemplate) return null;
    return activeTemplate.dailyAvg;
  }, [activeTemplate]);


  // ─── Selected Day Detail ───
  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return dailyData.find((d) => d.date === selectedDate) || null;
  }, [selectedDate, dailyData]);

  const groupedUnifiedFoods = useMemo(() => {
    if (!selectedDayData) return {};
    const groups: Record<string, UnifiedFoodItem[]> = {};
    for (const f of selectedDayData.unifiedFoods) {
      const key = f.meal_type || "snack";
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    }
    return groups;
  }, [selectedDayData]);

  const complianceSummary = useMemo(() => {
    if (!selectedDayData) return { consumed: 0, missed: 0, manual: 0, total: 0 };
    const items = selectedDayData.unifiedFoods;
    return {
      consumed: items.filter((f) => f.status === "consumed").length,
      missed: items.filter((f) => f.status === "missed").length,
      manual: items.filter((f) => f.status === "manual").length,
      total: items.length,
    };
  }, [selectedDayData]);

  const macroCards = [
    { label: "Kalori", value: activeMacros?.calories ?? targets.daily_calories, unit: "kcal", icon: Flame, color: "primary" },
    { label: "Protein", value: activeMacros?.protein ?? targets.protein_g, unit: "g", icon: Beef, color: "destructive" },
    { label: "Karbonhidrat", value: activeMacros?.carbs ?? targets.carbs_g, unit: "g", icon: Wheat, color: "warning" },
    { label: "Yağ", value: activeMacros?.fat ?? targets.fat_g, unit: "g", icon: Droplets, color: "accent" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ Targets Section ═══ */}
      <div className="glass rounded-xl border border-success/30 p-5">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-success/20 flex items-center justify-center">
              <Apple className="w-7 h-7 text-success" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Beslenme Hedefleri</h3>
              {activeTemplate ? (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="border-success/30 text-success text-xs gap-1">
                    <FileDown className="w-3 h-3" />
                    {activeTemplate.title}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-0.5 text-destructive hover:bg-destructive/10 rounded-full"
                      onClick={handleRemoveTemplate}
                      disabled={removingTemplate}
                    >
                      {removingTemplate ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <X className="w-2.5 h-2.5" />}
                    </Button>
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {hasExisting ? "Manuel hedefler aktif" : "Henüz hedef atanmadı"}
                </p>
              )}
            </div>
          </div>
          {!isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-success/30 text-success hover:bg-success/10"
                onClick={() => setShowTemplateDialog(true)}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Şablondan Ata
              </Button>
              <Button onClick={() => setIsEditing(true)} className="bg-success text-success-foreground hover:bg-success/90">
                <Edit className="w-4 h-4 mr-2" />
                {hasExisting ? "Düzenle" : "Hedef Ata"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="bg-success text-success-foreground hover:bg-success/90">
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Kaydet
              </Button>
              <Button variant="outline" onClick={handleCancel} className="border-border">
                <X className="w-4 h-4 mr-2" />İptal
              </Button>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 p-4 rounded-xl bg-secondary/30 border border-border">
            {[
              { key: "daily_calories" as const, label: "Kalori (kcal)", icon: Flame },
              { key: "protein_g" as const, label: "Protein (g)", icon: Beef },
              { key: "carbs_g" as const, label: "Karbonhidrat (g)", icon: Wheat },
              { key: "fat_g" as const, label: "Yağ (g)", icon: Droplets },
            ].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <field.icon className="w-3 h-3" />
                  {field.label}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={formValues[field.key]}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))}
                  className="bg-background"
                />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {macroCards.map((card) => {
            const colorMap: Record<string, string> = {
              primary: "bg-primary/10 border-primary/20 text-primary",
              destructive: "bg-destructive/10 border-destructive/20 text-destructive",
              warning: "bg-warning/10 border-warning/20 text-warning",
              accent: "bg-accent/20 border-accent/30 text-accent-foreground",
            };
            const classes = colorMap[card.color] || colorMap.primary;
            return (
              <div key={card.label} className={cn("p-4 rounded-xl border text-center", classes)}>
                <card.icon className="w-5 h-5 mx-auto mb-1" />
                <p className="text-2xl font-bold font-mono">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.unit} {card.label}</p>
              </div>
            );
          })}
        </div>
      </div>


      {/* ═══ Weekly Compliance Chart ═══ */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Beslenme Geçmişi & Uyum</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(dateRange.from, "d MMM", { locale: tr })} – {format(dateRange.to, "d MMM yyyy", { locale: tr })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {RANGE_PRESETS.map((p) => (
                <Button
                  key={p.days}
                  size="sm"
                  variant={!customRange && activePreset === p.days ? "default" : "outline"}
                  onClick={() => handlePreset(p.days)}
                  className="h-8 text-xs"
                >
                  {p.label}
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant={customRange ? "default" : "outline"}
                    className="h-8 text-xs"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                    Özel
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from) {
                        setDateRange({ from: range.from, to: range.to || range.from });
                        setCustomRange(true);
                        setActivePreset(0);
                        setSelectedDate(null);
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Badge variant={averageAdherence >= 80 ? "default" : averageAdherence >= 50 ? "secondary" : "destructive"}>
                Uyum: %{averageAdherence}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Bar Chart */}
              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyData}
                    onClick={(e) => {
                      if (e?.activePayload?.[0]?.payload?.date) {
                        const clickedDate = e.activePayload[0].payload.date;
                        setSelectedDate(selectedDate === clickedDate ? null : clickedDate);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      dataKey="date"
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => {
                        const totalDays = dailyData.length;
                        if (totalDays <= 7) return format(new Date(val), "EEE", { locale: tr });
                        if (totalDays <= 14) return format(new Date(val), "d MMM", { locale: tr });
                        return format(new Date(val), "d/M");
                      }}
                      interval={dailyData.length > 14 ? Math.floor(dailyData.length / 10) : 0}
                    />
                    <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        const pct = calorieTarget ? Math.round((d.totalCalories / calorieTarget) * 100) : 0;
                        return (
                          <div className="rounded-lg border border-border bg-background p-3 shadow-xl text-sm">
                            <p className="font-semibold text-foreground mb-1">
                              {format(new Date(d.date), "d MMMM", { locale: tr })}
                            </p>
                            {d.plannedCalories > 0 && (
                              <p className="text-muted-foreground">
                                📋 Planlanan: <span className="font-mono text-foreground">{d.plannedCalories}</span> kcal
                              </p>
                            )}
                            <p className="text-muted-foreground">
                              ✅ Tüketilen: <span className="font-mono text-foreground">{d.totalCalories}</span> / {calorieTarget} kcal
                            </p>
                            <p className="text-muted-foreground">Uyum: <span className="font-mono text-foreground">%{pct}</span></p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={calorieTarget}
                      stroke="hsl(var(--success))"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      label={{ value: `Hedef: ${calorieTarget}`, position: "insideTopRight", className: "fill-success text-xs" }}
                    />
                    {dailyData.some(d => d.plannedCalories > 0) && (
                      <Bar dataKey="plannedCalories" radius={[6, 6, 0, 0]} fill="hsl(var(--muted-foreground))" opacity={0.25} cursor="pointer" barSize={dailyData.length > 14 ? 6 : 12} />
                    )}
                    <Bar dataKey="totalCalories" radius={[6, 6, 0, 0]} cursor="pointer" barSize={dailyData.length > 14 ? 6 : 12}>
                      {dailyData.map((entry) => {
                        const pct = calorieTarget ? entry.totalCalories / calorieTarget : 0;
                        const isSelected = selectedDate === entry.date;
                        let fill = "hsl(var(--primary))";
                        if (pct > 1.15) fill = "hsl(var(--destructive))";
                        else if (pct >= 0.85) fill = "hsl(var(--success))";
                        else if (pct > 0) fill = "hsl(var(--warning))";
                        else fill = "hsl(var(--muted))";
                        return (
                          <Cell
                            key={entry.date}
                            fill={fill}
                            opacity={isSelected ? 1 : 0.8}
                            stroke={isSelected ? "hsl(var(--foreground))" : "none"}
                            strokeWidth={isSelected ? 2 : 0}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend */}
              {dailyData.some(d => d.plannedCalories > 0) && (
                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-muted-foreground/15 border border-muted-foreground/30" />
                    <span>Planlanan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-success" />
                    <span>Tüketilen (uyumlu)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-warning" />
                    <span>Düşük</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-destructive" />
                    <span>Fazla</span>
                  </div>
                </div>
              )}

              {/* ═══ Weekly Compliance Summary ═══ */}
              {(() => {
                const daysWithPlan = dailyData.filter(d => d.plannedCalories > 0);
                const daysFollowed = daysWithPlan.filter(d => {
                  const pct = d.plannedCalories > 0 ? d.totalCalories / d.plannedCalories : 0;
                  return pct >= 0.85 && pct <= 1.15;
                }).length;
                const totalMissed = dailyData.reduce((s, d) => s + d.unifiedFoods.filter(f => f.status === "missed").length, 0);
                const totalConsumed = dailyData.reduce((s, d) => s + d.unifiedFoods.filter(f => f.status === "consumed").length, 0);
                const totalManual = dailyData.reduce((s, d) => s + d.unifiedFoods.filter(f => f.status === "manual").length, 0);
                const totalPlanned = totalConsumed + totalMissed;
                const foodCompliance = totalPlanned > 0 ? Math.round((totalConsumed / totalPlanned) * 100) : 0;
                const avgCalDiff = daysWithPlan.length > 0
                  ? Math.round(daysWithPlan.reduce((s, d) => s + (d.totalCalories - d.plannedCalories), 0) / daysWithPlan.length)
                  : 0;

                const kpis = [
                  { label: "Plan Takip", value: `${daysFollowed}/${daysWithPlan.length}`, sub: "gün", icon: "📅", color: daysFollowed >= daysWithPlan.length * 0.7 ? "text-success" : "text-warning" },
                  { label: "Besin Uyumu", value: `%${foodCompliance}`, sub: `${totalConsumed}/${totalPlanned}`, icon: "🎯", color: foodCompliance >= 80 ? "text-success" : foodCompliance >= 50 ? "text-warning" : "text-destructive" },
                  { label: "Kaçırılan", value: `${totalMissed}`, sub: "besin", icon: "⚠️", color: totalMissed === 0 ? "text-success" : totalMissed <= 3 ? "text-warning" : "text-destructive" },
                  { label: "Ekstra Besin", value: `${totalManual}`, sub: "plan dışı", icon: "➕", color: "text-muted-foreground" },
                  { label: "Ort. Kalori Farkı", value: `${avgCalDiff > 0 ? "+" : ""}${avgCalDiff}`, sub: "kcal/gün", icon: "📊", color: Math.abs(avgCalDiff) <= 150 ? "text-success" : "text-warning" },
                ];

                return (
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {kpis.map((k) => (
                      <div key={k.label} className="text-center p-3 rounded-xl bg-secondary/30 border border-border/50">
                        <span className="text-lg">{k.icon}</span>
                        <p className={cn("text-lg font-bold font-mono mt-1", k.color)}>{k.value}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{k.sub}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{k.label}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Macro Averages Row */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  { label: "Ort. Kalori", value: `${macroAverages.calories}`, unit: "kcal", color: "text-primary" },
                  { label: "Ort. Protein", value: `${macroAverages.protein}`, unit: "g", color: "text-destructive" },
                  { label: "Ort. Karb", value: `${macroAverages.carbs}`, unit: "g", color: "text-warning" },
                  { label: "Ort. Yağ", value: `${macroAverages.fat}`, unit: "g", color: "text-accent-foreground" },
                ].map((m) => (
                  <div key={m.label} className="text-center p-2 rounded-lg bg-secondary/30">
                    <p className={cn("text-lg font-bold font-mono", m.color)}>{m.value}</p>
                    <p className="text-[11px] text-muted-foreground">{m.unit} · {m.label}</p>
                  </div>
                ))}
              </div>

              {/* Click hint */}
              <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                {selectedDate ? (
                  <><ChevronUp className="w-3 h-3" /> Detayı kapatmak için tekrar tıklayın</>
                ) : (
                  <><ChevronDown className="w-3 h-3" /> Günlük detay için bir sütuna tıklayın</>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══ Daily Detail Panel ═══ */}
      {selectedDate && selectedDayData && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                📋 {format(new Date(selectedDate), "d MMMM yyyy, EEEE", { locale: tr })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono border-primary/30">
                  {selectedDayData.totalCalories} kcal
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {/* Compliance Summary */}
            {selectedDayData.unifiedFoods.length > 0 && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {complianceSummary.consumed > 0 && (
                  <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">
                    <Check className="w-3 h-3 mr-1" />
                    {complianceSummary.consumed} Tüketildi
                  </Badge>
                )}
                {complianceSummary.missed > 0 && (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">
                    <X className="w-3 h-3 mr-1" />
                    {complianceSummary.missed} Kaçırıldı
                  </Badge>
                )}
                {complianceSummary.manual > 0 && (
                  <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/20">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {complianceSummary.manual} Plan Dışı
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedDayData.unifiedFoods.length === 0 && selectedDayData.foods.length === 0 ? (
              <div className="text-center py-8">
                <UtensilsCrossed className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Bu gün için besin kaydı bulunamadı.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(["breakfast", "lunch", "dinner", "snack"] as const).map((mealKey) => {
                  const items = groupedUnifiedFoods[mealKey];
                  if (!items?.length) return null;
                  return (
                    <div key={mealKey} className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        {MEAL_LABELS[mealKey] || mealKey}
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/30">
                            <TableHead className="text-xs w-8">Durum</TableHead>
                            <TableHead className="text-xs">Besin</TableHead>
                            <TableHead className="text-xs text-right">Porsiyon</TableHead>
                            <TableHead className="text-xs text-right">Kal</TableHead>
                            <TableHead className="text-xs text-right">P</TableHead>
                            <TableHead className="text-xs text-right">K</TableHead>
                            <TableHead className="text-xs text-right">Y</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((f) => (
                            <TableRow
                              key={f.id}
                              className={cn(
                                "border-border/20",
                                f.status === "missed" && "opacity-50"
                              )}
                            >
                              <TableCell className="py-1.5">
                                {f.status === "consumed" && (
                                  <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-success" />
                                  </div>
                                )}
                                {f.status === "missed" && (
                                  <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center">
                                    <X className="w-3 h-3 text-destructive" />
                                  </div>
                                )}
                                {f.status === "manual" && (
                                  <div className="w-5 h-5 rounded-full bg-warning/20 flex items-center justify-center">
                                    <AlertTriangle className="w-3 h-3 text-warning" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className={cn("text-sm font-medium", f.status === "missed" && "line-through text-muted-foreground")}>
                                {f.food_name}
                                {f.status === "missed" && (
                                  <span className="ml-2 text-[10px] text-destructive font-normal">(Kaçırıldı)</span>
                                )}
                                {f.status === "manual" && (
                                  <span className="ml-2 text-[10px] text-warning font-normal">(Plan Dışı)</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-right text-muted-foreground">{f.serving_size || "—"}</TableCell>
                              <TableCell className="text-sm text-right font-mono">
                                {f.status === "missed" ? f.plannedCalories : f.actualCalories}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono text-destructive">
                                {f.status === "missed" ? Math.round(f.plannedProtein) : Math.round(f.actualProtein)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono text-warning">
                                {f.status === "missed" ? Math.round(f.plannedCarbs) : Math.round(f.actualCarbs)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-mono text-accent-foreground">
                                {f.status === "missed" ? Math.round(f.plannedFat) : Math.round(f.actualFat)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}

                {/* Planned vs Actual Totals */}
                <div className="pt-3 border-t border-border space-y-2">
                  {selectedDayData.plannedCalories > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">📋 Planlanan Toplam</span>
                      <div className="flex items-center gap-4 font-mono text-muted-foreground">
                        <span>{selectedDayData.plannedCalories} kcal</span>
                        <span>{Math.round(selectedDayData.plannedProtein)}g P</span>
                        <span>{Math.round(selectedDayData.plannedCarbs)}g K</span>
                        <span>{Math.round(selectedDayData.plannedFat)}g Y</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">✅ Tüketilen Toplam</span>
                    <div className="flex items-center gap-4 font-mono">
                      <span>{selectedDayData.totalCalories} kcal</span>
                      <span className="text-destructive">{Math.round(selectedDayData.totalProtein)}g P</span>
                      <span className="text-warning">{Math.round(selectedDayData.totalCarbs)}g K</span>
                      <span className="text-accent-foreground">{Math.round(selectedDayData.totalFat)}g Y</span>
                    </div>
                  </div>
                  {selectedDayData.plannedCalories > 0 && (
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-muted-foreground">Uyum Oranı</span>
                      <Badge variant={
                        selectedDayData.totalCalories / selectedDayData.plannedCalories >= 0.85
                          ? "default"
                          : "destructive"
                      } className="font-mono">
                        %{Math.round((selectedDayData.totalCalories / selectedDayData.plannedCalories) * 100)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AssignDietTemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        athleteId={athleteId}
        onAssigned={fetchTargets}
        activeTemplateId={activeTemplate?.templateId}
      />
    </div>
  );
}
