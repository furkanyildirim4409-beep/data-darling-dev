import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Zap, Heart, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProgramSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteName: string;
}

const programs = [
  {
    id: "strength",
    name: "Kuvvet Programı",
    duration: "12 Hafta",
    icon: Dumbbell,
    color: "text-primary",
  },
  {
    id: "hypertrophy",
    name: "Hipertrofi Programı",
    duration: "8 Hafta",
    icon: Zap,
    color: "text-warning",
  },
  {
    id: "endurance",
    name: "Dayanıklılık Programı",
    duration: "6 Hafta",
    icon: Heart,
    color: "text-destructive",
  },
  {
    id: "competition",
    name: "Yarışma Hazırlığı",
    duration: "16 Hafta",
    icon: Trophy,
    color: "text-primary",
  },
];

export function ProgramSelectModal({ open, onOpenChange, athleteName }: ProgramSelectModalProps) {
  const handleSelectProgram = (program: typeof programs[0]) => {
    toast({
      title: "Program Atandı",
      description: `${athleteName} için "${program.name}" programı başlatıldı.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Program Seç</DialogTitle>
          <DialogDescription>
            {athleteName} için yeni bir program atayın
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {programs.map((program) => {
            const Icon = program.icon;
            return (
              <Button
                key={program.id}
                variant="outline"
                onClick={() => handleSelectProgram(program)}
                className="h-auto p-4 justify-start border-border hover:border-primary/50 hover:bg-primary/5"
              >
                <div className={cn("w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mr-4", program.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-foreground">{program.name}</div>
                  <div className="text-sm text-muted-foreground">{program.duration}</div>
                </div>
                <Badge variant="outline" className="ml-auto">
                  Başlat
                </Badge>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
