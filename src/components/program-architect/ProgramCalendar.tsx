import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Send,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BuilderExercise } from "./WorkoutBuilder";

const athletes = [
  { id: "1", name: "Ahmet Yılmaz", avatar: "", initials: "AY", tier: "Pro" },
  { id: "2", name: "Zeynep Kaya", avatar: "", initials: "ZK", tier: "Elite" },
  { id: "3", name: "Mehmet Demir", avatar: "", initials: "MD", tier: "Pro" },
  { id: "4", name: "Elif Öztürk", avatar: "", initials: "EÖ", tier: "Standart" },
  { id: "5", name: "Can Arslan", avatar: "", initials: "CA", tier: "Elite" },
  { id: "6", name: "Ayşe Yıldız", avatar: "", initials: "AY", tier: "Pro" },
  { id: "7", name: "Burak Şahin", avatar: "", initials: "BŞ", tier: "Standart" },
  { id: "8", name: "Selin Koç", avatar: "", initials: "SK", tier: "Pro" },
  { id: "9", name: "Emre Aksoy", avatar: "", initials: "EA", tier: "Elite" },
  { id: "10", name: "Deniz Çelik", avatar: "", initials: "DÇ", tier: "Standart" },
  { id: "11", name: "Fatma Erdoğan", avatar: "", initials: "FE", tier: "Pro" },
  { id: "12", name: "Oğuz Kara", avatar: "", initials: "OK", tier: "Elite" },
];

const turkishDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const turkishMonths = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

interface Assignment {
  athleteId: string;
  date: string;
  blockName: string;
  blockType: "hypertrophy" | "strength" | "endurance" | "nutrition";
}

interface ProgramCalendarProps {
  selectedExercises: BuilderExercise[];
  onClearBuilder: () => void;
}

export function ProgramCalendar({ selectedExercises, onClearBuilder }: ProgramCalendarProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([
    { athleteId: "1", date: "2026-01-28", blockName: "Hipertrofi A", blockType: "hypertrophy" },
    { athleteId: "1", date: "2026-01-30", blockName: "Güç Bloğu", blockType: "strength" },
    { athleteId: "2", date: "2026-01-29", blockName: "Hipertrofi A", blockType: "hypertrophy" },
    { athleteId: "3", date: "2026-01-28", blockName: "Beslenme", blockType: "nutrition" },
  ]);

  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const toggleDaySelection = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((i) => i !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const selectAllAthletes = () => {
    if (selectedAthletes.length === athletes.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(athletes.map(a => a.id));
    }
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const getAssignmentsForCell = (athleteId: string, date: Date) => {
    return assignments.filter(
      (a) => a.athleteId === athleteId && a.date === formatDate(date)
    );
  };

  const getBlockColor = (type: string) => {
    switch (type) {
      case "hypertrophy":
        return "bg-primary/20 text-primary border-primary/30";
      case "strength":
        return "bg-warning/20 text-warning border-warning/30";
      case "endurance":
        return "bg-info/20 text-info border-info/30";
      case "nutrition":
        return "bg-success/20 text-success border-success/30";
      default:
        return "bg-muted";
    }
  };

  const publishProgram = () => {
    if (selectedExercises.length === 0) {
      toast({
        title: "Hata",
        description: "Lütfen önce programa egzersiz ekleyin.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAthletes.length === 0) {
      toast({
        title: "Hata", 
        description: "Lütfen en az bir sporcu seçin.",
        variant: "destructive",
      });
      return;
    }

    // Create new assignments
    const newAssignments: Assignment[] = [];
    const daysToAssign = selectedDays.length > 0 ? selectedDays : [0, 2, 4]; // Default: Mon, Wed, Fri

    selectedAthletes.forEach((athleteId) => {
      daysToAssign.forEach((dayIndex) => {
        const date = weekDates[dayIndex];
        newAssignments.push({
          athleteId,
          date: formatDate(date),
          blockName: `${selectedExercises.length} Egzersiz`,
          blockType: "hypertrophy",
        });
      });
    });

    setAssignments([...assignments, ...newAssignments]);
    
    toast({
      title: "Program Yayınlandı!",
      description: `Program ${selectedAthletes.length} sporcuya başarıyla atandı!`,
    });

    // Clear selections
    setSelectedAthletes([]);
    setSelectedDays([]);
    onClearBuilder();
  };

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Program Takvimi
          </h2>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {turkishMonths[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Assignment Controls */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllAthletes}
            className={cn(
              "text-xs",
              selectedAthletes.length === athletes.length && "bg-primary/20 border-primary"
            )}
          >
            <CheckCircle className="w-3 h-3 mr-1.5" />
            {selectedAthletes.length === athletes.length ? "Seçimi Kaldır" : "Tümünü Seç"}
          </Button>
          <Badge variant="secondary" className="text-xs">
            {selectedAthletes.length} Sporcu Seçili
          </Badge>
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={publishProgram}
            disabled={selectedExercises.length === 0}
            className="bg-primary text-primary-foreground glow-lime"
          >
            <Send className="w-3 h-3 mr-1.5" />
            Programı Yayınla
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Calendar Grid Header - Day Selection */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs text-muted-foreground p-2">Sporcu</div>
            {weekDates.map((date, i) => (
              <button
                key={i}
                onClick={() => toggleDaySelection(i)}
                className={cn(
                  "text-center p-2 rounded-lg transition-all cursor-pointer",
                  selectedDays.includes(i)
                    ? "bg-primary/30 text-primary ring-1 ring-primary"
                    : formatDate(date) === formatDate(new Date())
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <p className="text-xs font-medium">{turkishDays[i]}</p>
                <p className="text-sm font-bold">{date.getDate()}</p>
              </button>
            ))}
          </div>

          {/* Athletes Rows */}
          <div className="space-y-1">
            {athletes.map((athlete) => (
              <div key={athlete.id} className="grid grid-cols-8 gap-1">
                {/* Athlete Cell */}
                <button
                  onClick={() => toggleAthleteSelection(athlete.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-all text-left",
                    selectedAthletes.includes(athlete.id)
                      ? "bg-primary/20 ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={athlete.avatar} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {athlete.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium truncate">
                    {athlete.name.split(" ")[0]}
                  </span>
                </button>

                {/* Day Cells */}
                {weekDates.map((date, i) => {
                  const cellAssignments = getAssignmentsForCell(athlete.id, date);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-[48px] rounded-lg border border-border/50 p-1 transition-all",
                        formatDate(date) === formatDate(new Date())
                          ? "bg-primary/5"
                          : "bg-background/30 hover:bg-muted/30"
                      )}
                    >
                      {cellAssignments.map((assignment, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 w-full justify-center border",
                            getBlockColor(assignment.blockType)
                          )}
                        >
                          {assignment.blockName.split(" ")[0]}
                        </Badge>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Blok Türleri:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs bg-primary/20 text-primary border-primary/30">
                Hipertrofi
              </Badge>
              <Badge variant="outline" className="text-xs bg-warning/20 text-warning border-warning/30">
                Güç
              </Badge>
              <Badge variant="outline" className="text-xs bg-info/20 text-info border-info/30">
                Dayanıklılık
              </Badge>
              <Badge variant="outline" className="text-xs bg-success/20 text-success border-success/30">
                Beslenme
              </Badge>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
