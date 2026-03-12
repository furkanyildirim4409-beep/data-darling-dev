import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Mail, Calendar, Edit, MoreHorizontal, User, Dumbbell, Apple, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EnergyBank } from "@/components/athlete-detail/EnergyBank";
import { SmartContract } from "@/components/athlete-detail/SmartContract";
import { BodyModel3D } from "@/components/athlete-detail/BodyModel3D";
import { WellnessRadar } from "@/components/athlete-detail/WellnessRadar";
import { BloodworkPanel } from "@/components/athlete-detail/BloodworkPanel";
import { MetabolicFlux } from "@/components/athlete-detail/MetabolicFlux";
import { TimelineAI } from "@/components/athlete-detail/TimelineAI";
import { ActiveBlocks } from "@/components/athlete-detail/ActiveBlocks";
import { AthleteProgressChart } from "@/components/athlete-detail/AthleteProgressChart";
import { ChatWidget } from "@/components/athlete-detail/ChatWidget";
import { ProgramTab } from "@/components/athlete-detail/ProgramTab";
import { NutritionTab } from "@/components/athlete-detail/NutritionTab";
import { WorkoutHistoryTab } from "@/components/athlete-detail/WorkoutHistoryTab";
import { cn } from "@/lib/utils";

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
}

interface CheckInData {
  mood: number | null;
  sleep: number | null;
  soreness: number | null;
  stress: number | null;
}

interface WorkoutSummary {
  total: number;
  completed: number;
  totalTonnage: number;
}

export default function AthleteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [latestCheckIn, setLatestCheckIn] = useState<CheckInData | null>(null);
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary>({ total: 0, completed: 0, totalTonnage: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAthleteData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);

    const [profileRes, checkInRes, workoutRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("daily_checkins").select("mood, sleep, soreness, stress").eq("user_id", id).order("created_at", { ascending: false }).limit(1),
      supabase.from("workout_logs").select("completed, tonnage").eq("user_id", id),
    ]);

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
  const energyLevel = athlete.readiness_score ?? 75;
  const missedWorkouts = workoutSummary.total - workoutSummary.completed;
  const totalWorkouts = workoutSummary.total || 1;
  const isVaultSecure = missedWorkouts <= 2;

  const wellnessData = {
    sleep: latestCheckIn?.sleep || 7,
    stress: latestCheckIn?.stress || 4,
    digestion: 8,
    mood: latestCheckIn?.mood || 7,
    soreness: latestCheckIn?.soreness || 3,
  };

  const startStats = { bodyFat: 22, muscleMass: 70, strength: 65, endurance: 55 };
  const currentStats = { bodyFat: 18, muscleMass: 75, strength: 82, endurance: 70 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/athletes")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />Kadroya Dön
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-border hover:bg-secondary"><Edit className="w-4 h-4 mr-2" />Profili Düzenle</Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreHorizontal className="w-5 h-5" /></Button>
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
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                  Seviye {athlete.level ?? 1}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {athlete.current_weight && <span>{athlete.current_weight} kg</span>}
                {athlete.streak && <><span>•</span><span>🔥 {athlete.streak} gün seri</span></>}
              </div>
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
            <EnergyBank percentage={energyLevel} />
            <SmartContract isSecure={isVaultSecure} missedWorkouts={missedWorkouts} totalWorkouts={totalWorkouts} />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass border border-border w-full justify-start gap-2 p-1 h-auto">
          <TabsTrigger value="general" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><User className="w-4 h-4" />Genel</TabsTrigger>
          <TabsTrigger value="program" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Dumbbell className="w-4 h-4" />Antrenman Programı</TabsTrigger>
          <TabsTrigger value="nutrition" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-success data-[state=active]:text-success-foreground"><Apple className="w-4 h-4" />Beslenme Planı</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><History className="w-4 h-4" />Antrenman Geçmişi</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground"><span className="w-2 h-2 rounded-full bg-primary" />Biyo-Veri</div>
              <BodyModel3D />
              <AthleteProgressChart athleteId={athlete.id} />
              <WellnessRadar data={wellnessData} /><BloodworkPanel />
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground"><span className="w-2 h-2 rounded-full bg-warning" />Performans</div>
              <MetabolicFlux /><TimelineAI currentStats={currentStats} startStats={startStats} />
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground"><span className="w-2 h-2 rounded-full bg-success" />Yönetim</div>
              <ActiveBlocks trainingBlock={{ name: "Program", week: 4, totalWeeks: 8, phase: "Hipertrofi Fazı" }} dietBlock={{ name: "Beslenme", calories: 0, protein: 0, type: "Kütle Kazanım Fazı" }} />
              <ChatWidget athleteName={name} athleteInitials={initials} />
            </div>
          </div>
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
    </div>
  );
}
