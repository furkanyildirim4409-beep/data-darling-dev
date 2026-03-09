import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, CheckCircle, Calendar, Dumbbell, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DayPlan } from "./WorkoutBuilder";

const athletes = [
  { id: "1", name: "Ahmet Yılmaz", initials: "AY" },
  { id: "2", name: "Zeynep Kaya", initials: "ZK" },
  { id: "3", name: "Mehmet Demir", initials: "MD" },
  { id: "4", name: "Elif Öztürk", initials: "EÖ" },
  { id: "5", name: "Can Arslan", initials: "CA" },
  { id: "6", name: "Ayşe Yıldız", initials: "AY" },
];

const turkishDays = [
  { short: "Pzt", full: "Pazartesi" },
  { short: "Sal", full: "Salı" },
  { short: "Çar", full: "Çarşamba" },
  { short: "Per", full: "Perşembe" },
  { short: "Cum", full: "Cuma" },
  { short: "Cmt", full: "Cumartesi" },
  { short: "Paz", full: "Pazar" },
];

interface WeeklyScheduleProps {
  weekPlan: DayPlan[];
  onClearBuilder: () => void;
}

export function WeeklySchedule({ weekPlan, onClearBuilder }: WeeklyScheduleProps) {
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);

  const totalExercises = weekPlan.reduce((acc, d) => acc + d.exercises.length, 0);

  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId) ? prev.filter((id) => id !== athleteId) : [...prev, athleteId]
    );
  };

  const selectAllAthletes = () => {
    if (selectedAthletes.length === athletes.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(athletes.map((a) => a.id));
    }
  };

  const publishProgram = () => {
    if (totalExercises === 0) {
      toast.error("Lütfen önce en az bir güne egzersiz ekleyin.");
      return;
    }

    if (selectedAthletes.length === 0) {
      toast.error("Lütfen en az bir sporcu seçin.");
      return;
    }

    toast.success(`Program ${selectedAthletes.length} sporcuya başarıyla atandı!`);
    setSelectedAthletes([]);
    onClearBuilder();
  };

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Haftalık Önizleme
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Programdaki günlerin özeti
        </p>
      </div>

      {/* Weekly Grid — auto-populated from weekPlan */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-7 gap-2">
          {turkishDays.map((day, index) => {
            const dayPlan = weekPlan[index];
            const hasExercises = dayPlan.exercises.length > 0;
            const daySets = dayPlan.exercises.reduce((s, ex) => s + ex.sets, 0);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] rounded-lg border p-2 transition-all",
                  hasExercises
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/20 opacity-60"
                )}
              >
                <p className="text-xs font-medium text-center mb-2">{day.short}</p>
                {hasExercises ? (
                  <div className="space-y-1">
                    <div className="bg-primary/20 text-primary text-[10px] px-1.5 py-1 rounded text-center font-medium">
                      {dayPlan.exercises.length} Egzersiz
                    </div>
                    <div className="text-[9px] text-muted-foreground text-center">
                      {daySets} Set
                    </div>
                    {dayPlan.label && (
                      <div className="text-[9px] text-primary/70 text-center truncate font-medium">
                        {dayPlan.label}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center mt-2">
                    <Moon className="w-4 h-4 text-muted-foreground/50 mb-1" />
                    <span className="text-[9px] text-muted-foreground">Dinlenme</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Athlete Selection */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Sporcu Seçimi</p>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllAthletes}
            className={cn(
              "text-xs h-7",
              selectedAthletes.length === athletes.length && "bg-primary/20 border-primary"
            )}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            {selectedAthletes.length === athletes.length ? "Kaldır" : "Tümü"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {athletes.map((athlete) => (
            <button
              key={athlete.id}
              onClick={() => toggleAthleteSelection(athlete.id)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-xs",
                selectedAthletes.includes(athlete.id)
                  ? "bg-primary/20 ring-1 ring-primary text-primary"
                  : "bg-muted/50 hover:bg-muted text-foreground"
              )}
            >
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-[8px] bg-muted">{athlete.initials}</AvatarFallback>
              </Avatar>
              {athlete.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Publish Button */}
      <div className="p-4 mt-auto">
        <Button
          className="w-full bg-primary text-primary-foreground glow-lime"
          onClick={publishProgram}
          disabled={totalExercises === 0}
        >
          <Send className="w-4 h-4 mr-2" />
          Programı Yayınla ({selectedAthletes.length} Sporcu)
        </Button>
      </div>
    </div>
  );
}
