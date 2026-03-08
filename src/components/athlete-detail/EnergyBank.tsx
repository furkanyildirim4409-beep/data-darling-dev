import { cn } from "@/lib/utils";
import { Battery, BatteryLow, BatteryMedium, BatteryFull, BatteryWarning } from "lucide-react";

interface EnergyBankProps {
  percentage: number;
}

export function EnergyBank({ percentage }: EnergyBankProps) {
  const getIcon = () => {
    if (percentage >= 80) return BatteryFull;
    if (percentage >= 50) return BatteryMedium;
    if (percentage >= 20) return BatteryLow;
    return BatteryWarning;
  };

  const getColor = () => {
    if (percentage >= 80) return "text-success";
    if (percentage >= 50) return "text-primary";
    if (percentage >= 20) return "text-warning";
    return "text-destructive";
  };

  const Icon = getIcon();

  return (
    <div className="glass rounded-xl border border-border p-4 flex items-center gap-4">
      <div className={cn("relative", getColor())}>
        <Icon className="w-12 h-12" />
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ filter: percentage >= 80 ? "drop-shadow(0 0 8px currentColor)" : "none" }}
        >
          <Icon className="w-12 h-12 opacity-50" />
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Enerji Bankası</p>
        <p className={cn("text-2xl font-bold font-mono", getColor())}>%{percentage}</p>
      </div>
    </div>
  );
}
