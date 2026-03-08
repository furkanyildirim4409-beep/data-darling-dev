import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, CheckCircle, Calendar, X, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BuilderExercise } from "./WorkoutBuilder";

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

interface ScheduleBlock {
  id: string;
  dayIndex: number;
  exerciseCount: number;
  blockName: string;
}

interface WeeklyScheduleProps {
  selectedExercises: BuilderExercise[];
  onClearBuilder: () => void;
}

export function WeeklySchedule({ selectedExercises, onClearBuilder }: WeeklyScheduleProps) {
  const { toast } = useToast();
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent) => {
    if (selectedExercises.length === 0) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", "exercises");
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverDay(dayIndex);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    setDragOverDay(null);

    if (selectedExercises.length === 0) return;

    const newBlock: ScheduleBlock = {
      id: `block-${Date.now()}`,
      dayIndex,
      exerciseCount: selectedExercises.length,
      blockName: `${selectedExercises.length} Egzersiz`,
    };

    setScheduleBlocks((prev) => [...prev, newBlock]);

    toast({
      title: "Blok Eklendi",
      description: `${turkishDays[dayIndex].full} gününe ${selectedExercises.length} egzersiz eklendi.`,
    });
  };

  const removeBlock = (blockId: string) => {
    setScheduleBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const getBlocksForDay = (dayIndex: number) => {
    return scheduleBlocks.filter((b) => b.dayIndex === dayIndex);
  };

  const publishProgram = () => {
    if (scheduleBlocks.length === 0) {
      toast({
        title: "Hata",
        description: "Lütfen önce takvime en az bir blok ekleyin.",
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

    toast({
      title: "Program Yayınlandı!",
      description: `Program ${selectedAthletes.length} sporcuya başarıyla atandı!`,
    });

    // Clear everything
    setSelectedAthletes([]);
    setScheduleBlocks([]);
    onClearBuilder();
  };

  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Haftalık Program
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Egzersiz bloğunu sürükleyip günlere bırakın
        </p>
      </div>

      {/* Draggable Block Source */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div
          draggable={selectedExercises.length > 0}
          onDragStart={handleDragStart}
          className={cn(
            "p-3 rounded-lg border-2 border-dashed transition-all flex items-center gap-3",
            selectedExercises.length > 0
              ? "border-primary/50 bg-primary/10 cursor-grab active:cursor-grabbing hover:border-primary"
              : "border-border bg-muted/20 cursor-not-allowed opacity-50"
          )}
        >
          <div className="p-2 rounded-lg bg-primary/20">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {selectedExercises.length > 0
                ? `${selectedExercises.length} Egzersiz Bloğu`
                : "Egzersiz seçin"}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedExercises.length > 0
                ? "Sürükleyip güne bırakın"
                : "Sol panelden egzersiz ekleyin"}
            </p>
          </div>
          {selectedExercises.length > 0 && (
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {selectedExercises.reduce((acc, ex) => acc + ex.sets, 0)} Set
            </Badge>
          )}
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-7 gap-2">
          {turkishDays.map((day, index) => {
            const dayBlocks = getBlocksForDay(index);
            return (
              <div
                key={index}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "min-h-[100px] rounded-lg border-2 border-dashed p-2 transition-all",
                  dragOverDay === index
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30"
                )}
              >
                <p className="text-xs font-medium text-center mb-2">{day.short}</p>
                <div className="space-y-1">
                  {dayBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="bg-primary/20 text-primary text-[10px] px-2 py-1 rounded flex items-center justify-between group"
                    >
                      <span className="truncate">{block.blockName}</span>
                      <button
                        onClick={() => removeBlock(block.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
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
          disabled={scheduleBlocks.length === 0}
        >
          <Send className="w-4 h-4 mr-2" />
          Programı Yayınla ({selectedAthletes.length} Sporcu)
        </Button>
      </div>
    </div>
  );
}
