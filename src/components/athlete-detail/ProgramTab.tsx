import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Apple, Calendar, Edit, Clock, Target, Flame, ChevronRight } from "lucide-react";

interface ProgramTabProps {
  athleteId: string;
  currentProgram: string;
}

// Mock workout program data
const workoutProgram = {
  name: "İt/Çek/Bacak Programı",
  phase: "Hipertrofi Fazı",
  week: 4,
  totalWeeks: 8,
  days: [
    {
      day: "Pazartesi",
      name: "İt Günü (Push)",
      exercises: [
        { name: "Bench Press", sets: 4, reps: "8-10", weight: "80kg" },
        { name: "Omuz Press", sets: 3, reps: "10-12", weight: "45kg" },
        { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", weight: "32kg" },
        { name: "Lateral Raise", sets: 4, reps: "12-15", weight: "12kg" },
        { name: "Triceps Pushdown", sets: 3, reps: "12-15", weight: "25kg" },
        { name: "Overhead Triceps Extension", sets: 3, reps: "10-12", weight: "20kg" },
      ],
    },
    {
      day: "Salı",
      name: "Çek Günü (Pull)",
      exercises: [
        { name: "Deadlift", sets: 4, reps: "5-6", weight: "140kg" },
        { name: "Barbell Row", sets: 4, reps: "8-10", weight: "70kg" },
        { name: "Lat Pulldown", sets: 3, reps: "10-12", weight: "65kg" },
        { name: "Face Pull", sets: 4, reps: "15-20", weight: "20kg" },
        { name: "Barbell Curl", sets: 3, reps: "10-12", weight: "30kg" },
        { name: "Hammer Curl", sets: 3, reps: "12-15", weight: "14kg" },
      ],
    },
    {
      day: "Çarşamba",
      name: "Bacak Günü (Legs)",
      exercises: [
        { name: "Squat", sets: 4, reps: "6-8", weight: "120kg" },
        { name: "Romanian Deadlift", sets: 3, reps: "10-12", weight: "90kg" },
        { name: "Leg Press", sets: 4, reps: "12-15", weight: "200kg" },
        { name: "Leg Curl", sets: 3, reps: "12-15", weight: "45kg" },
        { name: "Calf Raise", sets: 4, reps: "15-20", weight: "80kg" },
        { name: "Leg Extension", sets: 3, reps: "12-15", weight: "50kg" },
      ],
    },
    {
      day: "Perşembe",
      name: "Dinlenme",
      exercises: [],
    },
    {
      day: "Cuma",
      name: "Üst Vücut (Upper)",
      exercises: [
        { name: "Incline Bench Press", sets: 4, reps: "8-10", weight: "70kg" },
        { name: "Cable Row", sets: 4, reps: "10-12", weight: "60kg" },
        { name: "Dumbbell Shoulder Press", sets: 3, reps: "10-12", weight: "28kg" },
        { name: "Chin-ups", sets: 3, reps: "8-10", weight: "BW" },
        { name: "Dips", sets: 3, reps: "10-12", weight: "BW+10kg" },
      ],
    },
    {
      day: "Cumartesi",
      name: "Alt Vücut (Lower)",
      exercises: [
        { name: "Front Squat", sets: 4, reps: "8-10", weight: "90kg" },
        { name: "Hip Thrust", sets: 4, reps: "10-12", weight: "100kg" },
        { name: "Walking Lunges", sets: 3, reps: "12 adım", weight: "24kg" },
        { name: "Leg Curl", sets: 3, reps: "12-15", weight: "45kg" },
        { name: "Standing Calf Raise", sets: 4, reps: "12-15", weight: "70kg" },
      ],
    },
    {
      day: "Pazar",
      name: "Dinlenme",
      exercises: [],
    },
  ],
};

export function ProgramTab({ athleteId, currentProgram }: ProgramTabProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Program Header */}
      <div className="glass rounded-xl border border-primary/30 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{workoutProgram.name}</h3>
              <p className="text-sm text-muted-foreground">{workoutProgram.phase}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <Calendar className="w-3 h-3 mr-1" />
                  Hafta {workoutProgram.week}/{workoutProgram.totalWeeks}
                </Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <Target className="w-3 h-3 mr-1" />
                  6 Gün/Hafta
                </Badge>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate("/programs")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Edit className="w-4 h-4 mr-2" />
            Düzenle
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Program İlerlemesi</span>
            <span className="font-mono text-primary">
              %{Math.round((workoutProgram.week / workoutProgram.totalWeeks) * 100)}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(workoutProgram.week / workoutProgram.totalWeeks) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Haftalık Program
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workoutProgram.days.map((day) => (
            <div
              key={day.day}
              className={cn(
                "glass rounded-xl border p-4 transition-all",
                day.exercises.length > 0
                  ? "border-border hover:border-primary/30 cursor-pointer"
                  : "border-border/50 opacity-60"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">{day.day}</p>
                  <p className="font-semibold text-foreground">{day.name}</p>
                </div>
                {day.exercises.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {day.exercises.length} hareket
                  </Badge>
                )}
              </div>

              {day.exercises.length > 0 ? (
                <div className="space-y-2">
                  {day.exercises.slice(0, 3).map((ex, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/50"
                    >
                      <span className="text-foreground truncate flex-1">{ex.name}</span>
                      <span className="text-xs font-mono text-muted-foreground ml-2">
                        {ex.sets}x{ex.reps}
                      </span>
                    </div>
                  ))}
                  {day.exercises.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{day.exercises.length - 3} daha
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Aktif Toparlanma
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
