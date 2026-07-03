import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Calendar, Edit, MoreVertical, User, Dumbbell, Apple, History, Brain, Loader2, Snowflake, Zap, Wallet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";



import { usePermissions } from "@/hooks/usePermissions";
import { EnergyBank } from "@/components/athlete-detail/EnergyBank";
import { SmartContract } from "@/components/athlete-detail/SmartContract";
import { BodyMeasurementsStudio } from "@/components/athlete-detail/BodyMeasurementsStudio";
import { WellnessRadar } from "@/components/athlete-detail/WellnessRadar";
import { BloodworkPanel } from "@/components/athlete-detail/BloodworkPanel";
import { MetabolicFlux } from "@/components/athlete-detail/MetabolicFlux";
import { TimelineAI } from "@/components/athlete-detail/TimelineAI";
import { ActiveBlocks } from "@/components/athlete-detail/ActiveBlocks";
import { AthleteProgressChart } from "@/components/athlete-detail/AthleteProgressChart";
import { ChatWidget } from "@/components/athlete-detail/ChatWidget";
import { DraggableCardLayout } from "@/components/athlete-detail/DraggableCardLayout";
import { ProgramTab } from "@/components/athlete-detail/ProgramTab";
import { NutritionTab } from "@/components/athlete-detail/NutritionTab";
import { WorkoutHistoryTab } from "@/components/athlete-detail/WorkoutHistoryTab";
import { AiHistoryWidget } from "@/components/athlete-detail/AiHistoryWidget";
import { SensitiveActionOtpModal } from "@/components/coach/SensitiveActionOtpModal";



interface AthleteProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  readiness_score: number | null;
  created_at: string | null;
  current_weight: number | null;
  level: number | null;
  streak: number | null;
  bio: string | null;
  fitness_goal: string | null;
  packageTitle: string | null;
  subscription_status: string | null;
  latestPaidOrderId: string | null;
  latestPaidOrderTotal: number | null;

}

const GOAL_LABELS: Record<string, string> = {
  hypertrophy: "Hipertrofi / Kas Kazanımı",
  muscle_gain: "Hipertrofi / Kas Kazanımı",
  fat_loss: "Yağ Yakımı & Definasyon",
  weight_loss: "Yağ Yakımı & Definasyon",
  strength: "Maksimal Kuvvet",
  endurance: "Dayanıklılık",
  recomp: "Rekomp / Eşzamanlı Dönüşüm",
  recomposition: "Rekomp / Eşzamanlı Dönüşüm",
  health: "Sağlık & Yaşam Kalitesi",
  general_fitness: "Genel Fitness",
};

interface CheckInData {
  mood: number | null;
  sleep: number | null;
  soreness: number | null;
  stress: number | null;
  digestion: number | null;
}

interface WorkoutSummary {
  total: number;
  completed: number;
  totalTonnage: number;
}

export default function AthleteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canEditAthletes } = usePermissions();
  const [activeTab, setActiveTab] = useState("general");
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [latestCheckIn, setLatestCheckIn] = useState<CheckInData | null>(null);
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary>({ total: 0, completed: 0, totalTonnage: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiRefreshKey, setAiRefreshKey] = useState(0);

  // Subscription lifecycle dialogs
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeDuration, setFreezeDuration] = useState<"1_week" | "2_weeks" | "1_month">("1_week");
  const [freezeReason, setFreezeReason] = useState("");
  const [freezeLoading, setFreezeLoading] = useState(false);

  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateLoading, setTerminateLoading] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundKind, setRefundKind] = useState<"partial" | "full">("full");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  // OTP gate for sensitive actions
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'freeze' | 'terminate' | 'refund' | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);




  const runAiScan = useCallback(async () => {
    if (!id || aiScanning) return;
    setAiScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-doctor", {
        body: { athleteId: id },
      });
      if (error) throw error;
      setAiRefreshKey(Date.now());
      toast.success(`AI analizi tamamlandı: ${data?.insights?.length || 0} bulgu`);
    } catch (err: any) {
      console.error("AI scan error:", err);
      toast.error(err?.message || "AI taraması başarısız oldu");
    } finally {
      setAiScanning(false);
    }
  }, [id, aiScanning]);

  const haptic = () => { try { navigator.vibrate?.(15); } catch { /* noop */ } };

  const freezeSchema = z.object({
    duration: z.enum(["1_week", "2_weeks", "1_month"]),
    reason: z.string().trim().max(500).optional(),
  });

  const executeFreeze = async () => {
    if (!id) return;
    const parsed = freezeSchema.safeParse({ duration: freezeDuration, reason: freezeReason });
    if (!parsed.success) { toast.error("Geçersiz form"); return; }
    setFreezeLoading(true);
    try {
      const days = freezeDuration === "1_week" ? 7 : freezeDuration === "2_weeks" ? 14 : 30;
      const until = new Date(Date.now() + days * 86_400_000).toISOString();
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "frozen",
          freeze_until: until,
          freeze_reason: freezeReason.trim() || null,
        } as any)
        .eq("id", id);
      if (error) throw error;
      haptic();
      const label = freezeDuration === "1_week" ? "1 Hafta" : freezeDuration === "2_weeks" ? "2 Hafta" : "1 Ay";
      toast.success(`Üyelik donduruldu — ${label}`);
      setFreezeOpen(false);
      setFreezeReason("");
      fetchAthleteData();
    } catch (err: any) {
      toast.error(err?.message || "Dondurma başarısız oldu");
    } finally {
      setFreezeLoading(false);
    }
  };

  const submitTerminate = async () => {
    if (!id) return;
    setTerminateLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          coach_id: null,
          subscription_status: "terminated",
          active_program_id: null,
        } as any)
        .eq("id", id);
      if (error) throw error;
      haptic();
      toast.success("Sözleşme feshedildi");
      setTerminateOpen(false);
      navigate("/athletes");
    } catch (err: any) {
      toast.error(err?.message || "Fesih işlemi başarısız oldu");
    } finally {
      setTerminateLoading(false);
    }
  };

  const submitRefund = async () => {
    if (!id || !athlete) return;
    const maxAmount = athlete.latestPaidOrderTotal ?? 0;
    const amount = refundKind === "full" ? maxAmount : Number(refundAmount);
    const schema = z.object({
      amount: z.number().positive().max(maxAmount > 0 ? maxAmount : Number.MAX_SAFE_INTEGER),
      reason: z.string().trim().max(500).optional(),
    });
    const parsed = schema.safeParse({ amount, reason: refundReason });
    if (!parsed.success) { toast.error("Geçerli bir iade tutarı girin"); return; }
    setRefundLoading(true);
    try {
      if (!user?.id) { toast.error("Yetki doğrulanamadı"); setRefundLoading(false); return; }
      const { error } = await supabase.from("refund_requests").insert({
        athlete_id: id,
        coach_id: user.id,
        requested_amount: Math.abs(Number(amount)),
        reason: refundReason.trim() || refundKind,
        status: "pending",
      } as any);
      if (error) throw error;
      haptic();
      toast.success("İade talebi admin onayına başarıyla sunuldu.", { icon: "⏳" });
      queryClient.invalidateQueries({ queryKey: ["athlete", id] });
      setRefundOpen(false);
      setRefundAmount("");
      setRefundReason("");
      setRefundKind("full");
    } catch (err: any) {
      toast.error(err?.message || "İade talebi başarısız oldu");
    } finally {
      setRefundLoading(false);
    }
  };

  const handleUnfreezeAthlete = async () => {
    if (!id) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        freeze_until: null,
        freeze_reason: null,
      } as any)
      .eq('id', id);

    if (!error) {
      haptic();
      toast.success("Sporcunun aboneliği ve tüm premium özellikleri başarıyla aktifleştirildi!", { icon: "🟢" });
      queryClient.invalidateQueries({ queryKey: ['athlete', id] });
      fetchAthleteData();
    } else {
      toast.error("Abonelik aktifleştirilirken veritabanı senkronizasyon hatası oluştu.");
    }
  };

  const handleRemoveTermination = async () => {
    if (!id) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        active_program_id: null,
      } as any)
      .eq('id', id);

    if (!error) {
      haptic();
      toast.success("Fesih başarıyla kaldırıldı! Sporcu hesabı ve mağaza erişimi anında aktifleştirildi.", { icon: "🟢" });
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
      queryClient.invalidateQueries({ queryKey: ['athlete', id] });
      fetchAthleteData();
    } else {
      toast.error("Fesih kaldırılamadı: " + error.message);
    }
  };





  const fetchAthleteData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);

    const [profileRes, checkInRes, workoutRes, ordersRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("daily_checkins").select("mood, sleep, soreness, stress, digestion").eq("user_id", id).order("created_at", { ascending: false }).limit(1),
      supabase.from("workout_logs").select("completed, tonnage").eq("user_id", id),
      supabase
        .from("orders")
        .select("id, created_at, items, total_price")
        .eq("user_id", id)
        .eq("status", "paid")
        .eq("order_type", "coaching")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    let packageTitle: string | null = null;
    let latestPaidOrderId: string | null = null;
    let latestPaidOrderTotal: number | null = null;
    for (const o of ordersRes.data ?? []) {
      const items = Array.isArray((o as any).items) ? ((o as any).items as any[]) : [];
      const coachingItem = items.find((it) => it?.type === "coaching" || it?.item_type === "coaching");
      const title = coachingItem?.title;
      if (typeof title === "string" && title.trim()) {
        packageTitle = title.trim();
        latestPaidOrderId = (o as any).id;
        latestPaidOrderTotal = Number((o as any).total_price ?? 0) || null;
        break;
      }
    }

    if (profileRes.data) {
      const p = profileRes.data as any;
      setAthlete({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        readiness_score: p.readiness_score,
        created_at: p.created_at,
        current_weight: p.current_weight,
        level: p.level,
        streak: p.streak,
        bio: p.bio,
        fitness_goal: p.fitness_goal ?? null,
        packageTitle,
        subscription_status: p.subscription_status ?? null,
        latestPaidOrderId,
        latestPaidOrderTotal,
      });
    }


    if (checkInRes.data && checkInRes.data.length > 0) {
      setLatestCheckIn(checkInRes.data[0]);
    }

    if (workoutRes.data) {
      const total = workoutRes.data.length;
      const completed = workoutRes.data.filter((w: any) => w.completed).length;
      const totalTonnage = workoutRes.data.reduce((sum: number, w: any) => sum + (w.tonnage || 0), 0);
      setWorkoutSummary({ total, completed, totalTonnage });
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAthleteData();
  }, [fetchAthleteData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/athletes")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />Kadroya Dön
        </Button>
        <div className="glass rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">Sporcu bulunamadı.</p>
        </div>
      </div>
    );
  }

  const name = athlete.full_name || "İsimsiz";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase();
  const missedWorkouts = workoutSummary.total - workoutSummary.completed;
  const totalWorkouts = workoutSummary.total || 1;

  const wellnessData = {
    sleep: latestCheckIn?.sleep ?? null,
    stress: latestCheckIn?.stress ?? null,
    digestion: latestCheckIn?.digestion ?? null,
    mood: latestCheckIn?.mood ?? null,
    soreness: latestCheckIn?.soreness ?? null,
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/athletes")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />Kadroya Dön
        </Button>
        <div className="flex items-center gap-2">
          <Button
            onClick={runAiScan}
            disabled={aiScanning}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
          >
            {aiScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
            {aiScanning ? "Analiz Ediliyor..." : "🧠 AI Taraması"}
          </Button>
          {canEditAthletes && <Button variant="outline" className="border-border hover:bg-secondary"><Edit className="w-4 h-4 mr-2" />Profili Düzenle</Button>}
          {canEditAthletes && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 glass border-border">
                {athlete?.subscription_status === 'terminated' ? (
                  <DropdownMenuItem onClick={handleRemoveTermination} className="gap-2 text-emerald-400 font-semibold focus:text-emerald-400 focus:bg-emerald-500/10 cursor-pointer">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>♻️ Fesih Kaldır</span>
                  </DropdownMenuItem>
                ) : (
                  <>
                    {athlete?.subscription_status === 'frozen' ? (
                      <DropdownMenuItem onClick={handleUnfreezeAthlete} className="gap-2 text-emerald-400 font-semibold focus:text-emerald-400 focus:bg-emerald-500/10 cursor-pointer">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✅ Aboneliği Aktifleştir / Dondurmayı Kaldır</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => setFreezeOpen(true)} className="gap-2 cursor-pointer">
                        <Snowflake className="w-4 h-4 text-sky-400" />
                        <span>🚨 Üyeliği Dondur</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setRefundOpen(true)} className="gap-2 cursor-pointer">
                      <Wallet className="w-4 h-4 text-amber-400" />
                      <span>💰 Ücret İadesi Gönder</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setTerminateOpen(true)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <Zap className="w-4 h-4" />
                      <span>⚡ Sözleşmeyi Feshet</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

        </div>
      </div>

      <div className="glass rounded-xl border border-border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20 border-2 border-primary/30">
              <AvatarImage src={athlete.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{name}</h1>
                <Badge className="bg-gradient-to-r from-amber-500/15 to-purple-500/15 border border-amber-400/30 text-amber-300 backdrop-blur-md shadow-[0_0_12px_hsl(45_100%_60%_/_0.2)] font-semibold">
                  👑 {athlete.packageTitle ?? "Standart Üyelik"}
                </Badge>
                {athlete.subscription_status === "frozen" && (
                  <Badge className="bg-sky-500/15 border border-sky-400/30 text-sky-300 backdrop-blur-md">
                    ❄️ Dondurulmuş
                  </Badge>
                )}
                {athlete.subscription_status === "terminated" && (
                  <Badge className="bg-destructive/15 border border-destructive/30 text-destructive backdrop-blur-md">
                    ⚡ Feshedildi
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {athlete.current_weight && <span>{athlete.current_weight} kg</span>}
                {athlete.streak && <><span>•</span><span>🔥 {athlete.streak} gün seri</span></>}
              </div>
              {athlete.fitness_goal && (
                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-lg select-none flex-shrink-0 whitespace-nowrap mt-1.5">
                  🎯 Hedef: {GOAL_LABELS[athlete.fitness_goal] ?? athlete.fitness_goal}
                </span>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm">
                {athlete.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer">
                    <Mail className="w-4 h-4" /><span>{athlete.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Üyelik: {athlete.created_at ? new Date(athlete.created_at).toLocaleDateString('tr-TR') : '-'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <EnergyBank athleteId={athlete.id} />
            <SmartContract athleteId={athlete.id} missedWorkouts={missedWorkouts} totalWorkouts={totalWorkouts} />
          </div>
        </div>
      </div>

      {id && <AiHistoryWidget athleteId={id} key={aiRefreshKey} />}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass border border-border w-full justify-start gap-2 p-1 h-auto">
          <TabsTrigger value="general" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><User className="w-4 h-4" />Genel</TabsTrigger>
          <TabsTrigger value="program" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Dumbbell className="w-4 h-4" />Antrenman Programı</TabsTrigger>
          <TabsTrigger value="nutrition" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-success data-[state=active]:text-success-foreground"><Apple className="w-4 h-4" />Beslenme Planı</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><History className="w-4 h-4" />Antrenman Geçmişi</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <DraggableCardLayout
            athleteId={athlete.id}
            cards={{
              "body-model": <BodyMeasurementsStudio athleteId={athlete.id} />,
              "wellness-radar": <WellnessRadar data={wellnessData} />,
              "progress-chart": <AthleteProgressChart athleteId={athlete.id} />,
              "metabolic-flux": <MetabolicFlux athleteId={athlete.id} />,
              "timeline-ai": <TimelineAI athleteId={athlete.id} />,
              "active-blocks": <ActiveBlocks athleteId={athlete.id} />,
              "chat-widget": <ChatWidget athleteName={name} athleteInitials={initials} athleteId={athlete.id} />,
              "bloodwork-panel": <BloodworkPanel athleteId={athlete.id} />,
              
            }}
          />
        </TabsContent>

        <TabsContent value="program" className="mt-6">
          <ProgramTab athleteId={athlete.id} currentProgram="Program" />
        </TabsContent>

        <TabsContent value="nutrition" className="mt-6">
          <NutritionTab athleteId={athlete.id} currentDiet="Beslenme" calories={0} protein={0} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <WorkoutHistoryTab athleteId={athlete.id} />
        </TabsContent>
      </Tabs>

      {/* Freeze Subscription Dialog */}
      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent className="glass border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Snowflake className="w-5 h-5 text-sky-400" /> 🚨 Üyeliği Dondur</DialogTitle>
            <DialogDescription>Sporcunun aboneliği seçilen süre boyunca dondurulacak.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Süre</Label>
              <Select value={freezeDuration} onValueChange={(v) => setFreezeDuration(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_week">1 Hafta</SelectItem>
                  <SelectItem value="2_weeks">2 Hafta</SelectItem>
                  <SelectItem value="1_month">1 Ay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Açıklama (opsiyonel)</Label>
              <Textarea
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value.slice(0, 500))}
                placeholder="Dondurma sebebi…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFreezeOpen(false)} disabled={freezeLoading}>Vazgeç</Button>
            <Button onClick={submitFreeze} disabled={freezeLoading} className="bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30">
              {freezeLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Dondur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Contract Alert */}
      <AlertDialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-destructive" /> ⚡ Sözleşmeyi Feshet</AlertDialogTitle>
            <AlertDialogDescription>
              Sözleşme feshedilecek. Sporcu aktif kadrodan kaldırılacak ve atanmış programı sıfırlanacak. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={terminateLoading}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); submitTerminate(); }}
              disabled={terminateLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {terminateLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Feshet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="glass border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-amber-400" /> 💰 Ücret İadesi Gönder</DialogTitle>
            <DialogDescription>
              {athlete.latestPaidOrderTotal
                ? <>En son ödenen sipariş tutarı: <strong>{athlete.latestPaidOrderTotal.toLocaleString("tr-TR")} ₺</strong></>
                : "Bu sporcu için ödenmiş bir koçluk siparişi bulunmuyor."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <RadioGroup value={refundKind} onValueChange={(v) => setRefundKind(v as any)} className="grid grid-cols-2 gap-2">
              <Label htmlFor="r-full" className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${refundKind === "full" ? "border-amber-400/50 bg-amber-500/10" : "border-border"}`}>
                <RadioGroupItem value="full" id="r-full" /> Tam İade
              </Label>
              <Label htmlFor="r-partial" className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${refundKind === "partial" ? "border-amber-400/50 bg-amber-500/10" : "border-border"}`}>
                <RadioGroupItem value="partial" id="r-partial" /> Kısmi İade
              </Label>
            </RadioGroup>
            {refundKind === "partial" && (
              <div className="space-y-2">
                <Label>Tutar (₺)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={athlete.latestPaidOrderTotal ?? undefined}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Açıklama (opsiyonel)</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value.slice(0, 500))}
                placeholder="İade gerekçesi…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefundOpen(false)} disabled={refundLoading}>Vazgeç</Button>
            <Button
              onClick={submitRefund}
              disabled={refundLoading || !athlete.latestPaidOrderId}
              className="bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
            >
              {refundLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} İade Talebini Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
