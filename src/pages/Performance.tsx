import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search, ArrowUpDown, TrendingUp, TrendingDown, Trophy, ChevronLeft, Activity } from "lucide-react";

interface PerformanceAthlete {
  id: string;
  name: string;
  sport: string;
  readiness: number;
  compliance: number;
  injuryRisk: "Low" | "Medium" | "High";
  performanceScore: number;
}

function classifyRisk(readiness: number): "Low" | "Medium" | "High" {
  if (readiness >= 70) return "Low";
  if (readiness >= 50) return "Medium";
  return "High";
}

function calcPerformance(compliance: number, readiness: number, risk: "Low" | "Medium" | "High"): number {
  const riskPenalty = risk === "High" ? 20 : risk === "Medium" ? 10 : 0;
  return Math.round(compliance * 0.4 + readiness * 0.4 + 20 - riskPenalty);
}

function getScoreBadge(score: number) {
  if (score >= 80) return { label: "Mükemmel", variant: "success" as const };
  if (score >= 60) return { label: "İyi", variant: "warning" as const };
  return { label: "Gelişmeli", variant: "destructive" as const };
}

export default function Performance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<PerformanceAthlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchPerformance = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const coachId = user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [profilesRes, workoutsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, readiness_score, fitness_goal")
        .eq("coach_id", coachId)
        .eq("role", "athlete"),
      supabase
        .from("assigned_workouts")
        .select("id, status, athlete_id")
        .eq("coach_id", coachId)
        .gte("scheduled_date", sevenDaysAgo),
    ]);

    const profileList = profilesRes.data ?? [];
    const workoutList = workoutsRes.data ?? [];

    // Compliance per athlete: completed / total assigned (last 7 days)
    const complianceMap = new Map<string, { total: number; completed: number }>();
    for (const w of workoutList) {
      if (!w.athlete_id) continue;
      const entry = complianceMap.get(w.athlete_id) ?? { total: 0, completed: 0 };
      entry.total++;
      if (w.status === "completed") entry.completed++;
      complianceMap.set(w.athlete_id, entry);
    }

    const result: PerformanceAthlete[] = profileList.map((p) => {
      const readiness = p.readiness_score ?? 75;
      const comp = complianceMap.get(p.id);
      const compliance = comp && comp.total > 0 ? Math.round((comp.completed / comp.total) * 100) : 0;
      const risk = classifyRisk(readiness);
      return {
        id: p.id,
        name: p.full_name || "İsimsiz",
        sport: p.fitness_goal || "Genel",
        readiness,
        compliance,
        injuryRisk: risk,
        performanceScore: calcPerformance(compliance, readiness, risk),
      };
    });

    setAthletes(result);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const filteredAndSorted = useMemo(() => {
    let result = athletes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q) || a.sport.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => sortOrder === "asc" ? a.performanceScore - b.performanceScore : b.performanceScore - a.performanceScore);
  }, [athletes, searchQuery, sortOrder]);

  const toggleSort = () => setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
  const avgScore = athletes.length > 0 ? Math.round(athletes.reduce((s, a) => s + a.performanceScore, 0) / athletes.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-secondary"><ChevronLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Performans Analizi</h1>
            <p className="text-muted-foreground mt-1">Tüm sporcuların performans skorları ve sıralaması</p>
          </div>
        </div>
        <div className="glass rounded-xl p-4 border border-primary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Trophy className="w-5 h-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Ortalama Skor</p><p className="text-2xl font-bold font-mono text-primary">{avgScore}</p></div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Sporcu veya branş ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/50 border-border focus:border-primary" />
        </div>
        <Button variant="outline" onClick={toggleSort} className="border-border hover:bg-secondary">
          <ArrowUpDown className="w-4 h-4 mr-2" />{sortOrder === "desc" ? "Yüksekten Düşüğe" : "Düşükten Yükseğe"}
        </Button>
      </div>

      <div className="glass rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : athletes.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground">Henüz sporcu bulunamadı</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Sıra</TableHead>
                <TableHead className="text-muted-foreground">Sporcu</TableHead>
                <TableHead className="text-muted-foreground">Branş</TableHead>
                <TableHead className="text-muted-foreground">Uyumluluk</TableHead>
                <TableHead className="text-muted-foreground">Hazırlık</TableHead>
                <TableHead className="text-muted-foreground">Risk</TableHead>
                <TableHead className="text-muted-foreground cursor-pointer" onClick={toggleSort}><div className="flex items-center gap-2">Performans Skoru<ArrowUpDown className="w-4 h-4" /></div></TableHead>
                <TableHead className="text-muted-foreground">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((athlete, index) => {
                const scoreBadge = getScoreBadge(athlete.performanceScore);
                return (
                  <TableRow key={athlete.id} className="border-border hover:bg-secondary/50 cursor-pointer transition-colors" onClick={() => navigate(`/athletes/${athlete.id}`)}>
                    <TableCell className="font-mono text-muted-foreground">#{index + 1}</TableCell>
                    <TableCell><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-sm font-bold text-primary">{athlete.name.charAt(0)}</span></div><span className="font-medium text-foreground">{athlete.name}</span></div></TableCell>
                    <TableCell className="text-muted-foreground">{athlete.sport}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><div className="w-16 h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${athlete.compliance}%` }} /></div><span className="text-sm font-mono text-foreground">{athlete.compliance}%</span></div></TableCell>
                    <TableCell><span className="font-mono text-foreground">{athlete.readiness}</span></TableCell>
                    <TableCell><Badge variant="outline" className={cn("text-xs", athlete.injuryRisk === "Low" && "border-success/30 text-success", athlete.injuryRisk === "Medium" && "border-warning/30 text-warning", athlete.injuryRisk === "High" && "border-destructive/30 text-destructive")}>{athlete.injuryRisk === "Low" ? "Düşük" : athlete.injuryRisk === "Medium" ? "Orta" : "Yüksek"}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-2"><span className={cn("text-xl font-bold font-mono", athlete.performanceScore >= 80 && "text-success", athlete.performanceScore >= 60 && athlete.performanceScore < 80 && "text-warning", athlete.performanceScore < 60 && "text-destructive")}>{athlete.performanceScore}</span>{athlete.performanceScore >= 80 ? <TrendingUp className="w-4 h-4 text-success" /> : athlete.performanceScore < 60 ? <TrendingDown className="w-4 h-4 text-destructive" /> : null}</div></TableCell>
                    <TableCell><Badge variant="outline" className={cn("text-xs", scoreBadge.variant === "success" && "border-success/30 text-success bg-success/10", scoreBadge.variant === "warning" && "border-warning/30 text-warning bg-warning/10", scoreBadge.variant === "destructive" && "border-destructive/30 text-destructive bg-destructive/10")}>{scoreBadge.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {!isLoading && filteredAndSorted.length === 0 && athletes.length > 0 && (
        <div className="glass rounded-xl border border-border p-12 text-center"><p className="text-muted-foreground">Arama kriterlerine uyan sporcu bulunamadı.</p></div>
      )}
    </div>
  );
}
