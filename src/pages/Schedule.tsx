import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WorkoutBuilderModal } from "@/components/schedule/WorkoutBuilderModal";
import { WorkoutDetailModal } from "@/components/schedule/WorkoutDetailModal";

interface Athlete {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface AssignedWorkout {
  id: string;
  workout_name: string;
  scheduled_date: string;
  status: string | null;
  exercises: Exercise[];
  athlete_id: string | null;
}

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
}

export default function Schedule() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [workouts, setWorkouts] = useState<AssignedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  
  // Modal states
  const [builderOpen, setBuilderOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<AssignedWorkout | null>(null);

  // Fetch coach's athletes
  useEffect(() => {
    const fetchAthletes = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("coach_id", user.id);
      
      if (error) {
        toast.error("Sporcular yüklenirken hata oluştu");
        console.error(error);
      } else {
        setAthletes(data || []);
        if (data && data.length > 0 && !selectedAthlete) {
          setSelectedAthlete(data[0].id);
        }
      }
      setLoading(false);
    };

    fetchAthletes();
  }, [user]);

  // Fetch workouts for selected athlete and month
  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!user || !selectedAthlete) return;
      
      setWorkoutsLoading(true);
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data, error } = await supabase
        .from("assigned_workouts")
        .select("*")
        .eq("coach_id", user.id)
        .eq("athlete_id", selectedAthlete)
        .gte("scheduled_date", format(start, "yyyy-MM-dd"))
        .lte("scheduled_date", format(end, "yyyy-MM-dd"));
      
      if (error) {
        toast.error("Antrenmanlar yüklenirken hata oluştu");
        console.error(error);
      } else {
        // Parse exercises JSONB with proper type assertion
        const parsed = (data || []).map(w => ({
          ...w,
          exercises: Array.isArray(w.exercises) ? (w.exercises as unknown as Exercise[]) : []
        }));
        setWorkouts(parsed);
      }
      setWorkoutsLoading(false);
    };

    fetchWorkouts();
  }, [user, selectedAthlete, currentMonth]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get workouts for a specific day
  const getWorkoutsForDay = (day: Date) => {
    return workouts.filter(w => isSameDay(new Date(w.scheduled_date), day));
  };

  const handleDayClick = (day: Date) => {
    const dayWorkouts = getWorkoutsForDay(day);
    if (dayWorkouts.length > 0) {
      setSelectedWorkout(dayWorkouts[0]);
      setDetailOpen(true);
    } else {
      setSelectedDate(day);
      setBuilderOpen(true);
    }
  };

  const handleAddWorkout = (day: Date) => {
    setSelectedDate(day);
    setBuilderOpen(true);
  };

  const handleWorkoutSaved = () => {
    // Refresh workouts
    setBuilderOpen(false);
    // Trigger refetch
    const fetchWorkouts = async () => {
      if (!user || !selectedAthlete) return;
      
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const { data } = await supabase
        .from("assigned_workouts")
        .select("*")
        .eq("coach_id", user.id)
        .eq("athlete_id", selectedAthlete)
        .gte("scheduled_date", format(start, "yyyy-MM-dd"))
        .lte("scheduled_date", format(end, "yyyy-MM-dd"));
      
      if (data) {
        const parsed = data.map(w => ({
          ...w,
          exercises: Array.isArray(w.exercises) ? (w.exercises as unknown as Exercise[]) : []
        }));
        setWorkouts(parsed);
      }
    };
    fetchWorkouts();
  };

  const handleWorkoutDeleted = () => {
    setDetailOpen(false);
    setSelectedWorkout(null);
    handleWorkoutSaved();
  };

  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary" />
            Antrenman Takvimi
          </h1>
          <p className="text-muted-foreground mt-1">
            Sporcularınıza antrenman atayın ve takip edin
          </p>
        </div>
        
        {/* Athlete Selector */}
        <div className="w-full sm:w-64">
          <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Sporcu seçin" />
            </SelectTrigger>
            <SelectContent>
              {athletes.map((athlete) => (
                <SelectItem key={athlete.id} value={athlete.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                      {athlete.full_name?.charAt(0) || "?"}
                    </div>
                    {athlete.full_name || "İsimsiz Sporcu"}
                  </div>
                </SelectItem>
              ))}
              {athletes.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Henüz sporcu eklemediniz
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy", { locale: tr })}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayWorkouts = getWorkoutsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const hasWorkouts = dayWorkouts.length > 0;
              const hasPending = dayWorkouts.some(w => w.status === "pending");
              const hasCompleted = dayWorkouts.some(w => w.status === "completed");

              return (
                <div
                  key={idx}
                  onClick={() => selectedAthlete && handleDayClick(day)}
                  className={cn(
                    "relative min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 rounded-lg border transition-all cursor-pointer group",
                    isCurrentMonth 
                      ? "bg-card/80 border-border/50 hover:border-primary/50 hover:bg-card" 
                      : "bg-muted/20 border-transparent opacity-40",
                    isToday && "ring-2 ring-primary/50 border-primary/30",
                    !selectedAthlete && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {format(day, "d")}
                  </div>

                  {/* Workout indicators */}
                  {hasWorkouts && (
                    <div className="space-y-1">
                      {dayWorkouts.slice(0, 2).map((workout, i) => (
                        <div
                          key={workout.id}
                          className={cn(
                            "text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate",
                            workout.status === "completed" 
                              ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                              : "bg-primary/20 text-primary border border-primary/30"
                          )}
                        >
                          <span className="hidden sm:inline">{workout.workout_name}</span>
                          <Dumbbell className="h-3 w-3 sm:hidden" />
                        </div>
                      ))}
                      {dayWorkouts.length > 2 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{dayWorkouts.length - 2} daha
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add button on hover */}
                  {isCurrentMonth && selectedAthlete && !hasWorkouts && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute inset-0 m-auto w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddWorkout(day);
                      }}
                    >
                      <Plus className="h-4 w-4 text-primary" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
              <span>Bekliyor</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded bg-accent/40 border border-accent/50" />
              <span>Tamamlandı</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workout Builder Modal */}
      <WorkoutBuilderModal
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        selectedDate={selectedDate}
        athleteId={selectedAthlete}
        onSaved={handleWorkoutSaved}
      />

      {/* Workout Detail Modal */}
      <WorkoutDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        workout={selectedWorkout}
        onDeleted={handleWorkoutDeleted}
      />
    </div>
  );
}
