import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Loader2, Apple, Flame, Beef, Wheat, Droplets, Check, CalendarIcon, X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { generateAssignedDietDays } from "@/utils/dietAssignment";

interface TemplateWithMacros {
  id: string;
  title: string;
  description: string | null;
  target_calories: number | null;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  foodCount: number;
}

interface AssignDietTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  onAssigned: () => void;
  activeTemplateId?: string | null;
}

const DURATION_OPTIONS = [
  { value: "1", label: "1 Hafta" },
  { value: "4", label: "4 Hafta" },
  { value: "8", label: "8 Hafta" },
  { value: "12", label: "12 Hafta" },
];

function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function AssignDietTemplateDialog({
  open,
  onOpenChange,
  athleteId,
  onAssigned,
  activeTemplateId,
}: AssignDietTemplateDialogProps) {
  const { user, activeCoachId } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithMacros[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(getNextMonday());
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateWithMacros | null>(null);
  const [previewFoods, setPreviewFoods] = useState<Record<string, any[]>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (tpl: TemplateWithMacros) => {
    setPreviewTemplate(tpl);
    if (previewFoods[tpl.id]) return;
    setPreviewLoading(true);
    const { data } = await supabase
      .from("diet_template_foods")
      .select("meal_type, food_name, serving_size, calories, protein, carbs, fat, day_number")
      .eq("template_id", tpl.id)
      .order("day_number")
      .order("meal_type");
    setPreviewFoods((prev) => ({ ...prev, [tpl.id]: data ?? [] }));
    setPreviewLoading(false);
  };

  useEffect(() => {
    if (!open || !user || !activeCoachId) return;
    setStartDate(getNextMonday());
    setDurationWeeks("4");
    (async () => {
      setLoading(true);
      const { data: tpls } = await supabase
        .from("diet_templates")
        .select("id, title, description, target_calories")
        .eq("coach_id", activeCoachId)
        .order("created_at", { ascending: false });

      if (!tpls?.length) {
        setTemplates([]);
        setLoading(false);
        return;
      }

      const { data: foods } = await supabase
        .from("diet_template_foods")
        .select("template_id, calories, protein, carbs, fat")
        .in("template_id", tpls.map((t) => t.id));

      const mapped: TemplateWithMacros[] = tpls.map((t) => {
        const tf = (foods || []).filter((f) => f.template_id === t.id);
        return {
          ...t,
          totalCalories: tf.reduce((s, f) => s + (f.calories || 0), 0),
          totalProtein: tf.reduce((s, f) => s + (Number(f.protein) || 0), 0),
          totalCarbs: tf.reduce((s, f) => s + (Number(f.carbs) || 0), 0),
          totalFat: tf.reduce((s, f) => s + (Number(f.fat) || 0), 0),
          foodCount: tf.length,
        };
      });
      setTemplates(mapped);
      setLoading(false);
    })();
  }, [open, user]);

  const handleAssign = async (tpl: TemplateWithMacros) => {
    if (!user || !activeCoachId) return;
    setAssigning(tpl.id);

    const { error } = await supabase.rpc("assign_diet_template" as any, {
      _athlete_id: athleteId,
      _coach_id: activeCoachId,
      _template_id: tpl.id,
      _start_date: format(startDate, "yyyy-MM-dd"),
      _duration_weeks: Number(durationWeeks),
    });

    if (error) {
      toast({
        title: "Atama başarısız",
        description: error.message,
        variant: "destructive",
      });
      setAssigning(null);
      return;
    }

    toast({ title: "Başarılı", description: "Beslenme programı sporcuya atandı!" });
    onAssigned();
    onOpenChange(false);
    setAssigning(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Apple className="w-5 h-5 text-success" />
            Beslenme Programı Ata
          </DialogTitle>
          <DialogDescription>
            Bir diyet şablonu seçerek beslenme programını sporcuya atayın.
          </DialogDescription>
        </DialogHeader>

        {/* Date & Duration Selectors */}
        <div className="flex items-center gap-3 pb-2 border-b border-border">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal gap-2", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5" />
                {format(startDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => d && setStartDate(startOfWeek(d, { weekStartsOn: 1 }))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <p className="text-[10px] text-muted-foreground">Seçtiğiniz tarih haftanın Pazartesi gününe yuvarlanır</p>
          <Select value={durationWeeks} onValueChange={setDurationWeeks}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[440px] max-h-[50vh] w-full pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Apple className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Henüz diyet şablonu oluşturmadınız.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pb-4">
              {templates.map((tpl) => {
                const isActive = activeTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPreview(tpl)}
                    onKeyDown={(e) => { if (e.key === "Enter") openPreview(tpl); }}
                    className={`rounded-xl border p-4 transition-colors cursor-pointer ${
                      isActive
                        ? "border-success/40 bg-success/5"
                        : "border-border hover:border-success/40"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{tpl.title}</h4>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {tpl.foodCount} besin
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { icon: Flame, value: tpl.totalCalories, label: "kcal", color: "text-primary" },
                        { icon: Beef, value: Math.round(tpl.totalProtein), label: "g P", color: "text-destructive" },
                        { icon: Wheat, value: Math.round(tpl.totalCarbs), label: "g C", color: "text-warning" },
                        { icon: Droplets, value: Math.round(tpl.totalFat), label: "g F", color: "text-accent-foreground" },
                      ].map((m) => (
                        <div key={m.label} className="text-center p-2 rounded-lg bg-secondary/30">
                          <m.icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${m.color}`} />
                          <p className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</p>
                          <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); openPreview(tpl); }}
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Önizleme
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                        disabled={assigning === tpl.id || isActive}
                        onClick={(e) => { e.stopPropagation(); handleAssign(tpl); }}
                      >
                        {isActive ? (
                          <>
                            <Check className="w-4 h-4 mr-1.5" />
                            Aktif
                          </>
                        ) : assigning === tpl.id ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1.5" />
                            Ata
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      <Sheet open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between space-y-0">
            <div className="min-w-0">
              <SheetTitle className="truncate flex items-center gap-2">
                <Apple className="w-4 h-4 text-success" />
                {previewTemplate?.title}
              </SheetTitle>
              {previewTemplate?.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{previewTemplate.description}</p>
              )}
            </div>
            <SheetClose className="rounded-md p-1 hover:bg-muted">
              <X className="w-4 h-4" />
            </SheetClose>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {previewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : previewTemplate && (previewFoods[previewTemplate.id]?.length ?? 0) === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Bu şablonda besin yok.</p>
            ) : previewTemplate && (() => {
              const foods = previewFoods[previewTemplate.id] ?? [];
              const groups = new Map<string, any[]>();
              foods.forEach((f) => {
                const key = `${f.day_number ? `Gün ${f.day_number} — ` : ""}${f.meal_type || "Öğün"}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(f);
              });
              return [...groups.entries()].map(([meal, items]) => (
                <div key={meal} className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{meal}</h5>
                  <div className="space-y-2">
                    {items.map((f, i) => (
                      <div key={i} className="rounded-lg border border-border p-3 bg-card">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground">{f.food_name}</p>
                            {f.serving_size && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{f.serving_size}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge className="text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/10">{f.calories ?? 0} kcal</Badge>
                          <Badge className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/10">{Math.round(Number(f.protein) || 0)}g P</Badge>
                          <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">{Math.round(Number(f.carbs) || 0)}g C</Badge>
                          <Badge className="text-[10px] bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/10">{Math.round(Number(f.fat) || 0)}g F</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </Dialog>
  );
}
