import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Apple, Calendar, ChevronRight } from "lucide-react";

interface ActiveBlocksProps {
  trainingBlock: {
    name: string;
    week: number;
    totalWeeks: number;
    phase: string;
  };
  dietBlock: {
    name: string;
    calories: number;
    protein: number;
    type: string;
  };
}

export function ActiveBlocks({ trainingBlock, dietBlock }: ActiveBlocksProps) {
  return (
    <div className="space-y-4">
      {/* Training Block */}
      <div className="glass rounded-xl border border-border p-4 hover:border-primary/30 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{trainingBlock.name}</h4>
              <p className="text-xs text-muted-foreground">{trainingBlock.phase}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            Hafta {trainingBlock.week}/{trainingBlock.totalWeeks}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">İlerleme</span>
            <span className="font-mono text-foreground">
              %{Math.round((trainingBlock.week / trainingBlock.totalWeeks) * 100)}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(trainingBlock.week / trainingBlock.totalWeeks) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Diet Block */}
      <div className="glass rounded-xl border border-border p-4 hover:border-success/30 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Apple className="w-5 h-5 text-success" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{dietBlock.name}</h4>
              <p className="text-xs text-muted-foreground">{dietBlock.type}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-success transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-secondary/50 text-center">
            <p className="text-lg font-bold font-mono text-foreground">{dietBlock.calories}</p>
            <p className="text-[10px] text-muted-foreground">kcal/gün</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/50 text-center">
            <p className="text-lg font-bold font-mono text-foreground">{dietBlock.protein}g</p>
            <p className="text-[10px] text-muted-foreground">protein</p>
          </div>
        </div>
      </div>
    </div>
  );
}
