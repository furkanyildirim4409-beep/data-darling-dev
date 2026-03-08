import { cn } from "@/lib/utils";
import { Lock, Unlock, ShieldCheck, ShieldAlert } from "lucide-react";

interface SmartContractProps {
  isSecure: boolean;
  missedWorkouts: number;
  totalWorkouts: number;
}

export function SmartContract({ isSecure, missedWorkouts, totalWorkouts }: SmartContractProps) {
  return (
    <div className={cn(
      "glass rounded-xl border p-4 flex items-center gap-4",
      isSecure ? "border-success/30" : "border-destructive/30"
    )}>
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center",
        isSecure ? "bg-success/20" : "bg-destructive/20 animate-pulse"
      )}>
        {isSecure ? (
          <ShieldCheck className="w-6 h-6 text-success" />
        ) : (
          <ShieldAlert className="w-6 h-6 text-destructive" />
        )}
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Akıllı Sözleşme</p>
        <p className={cn(
          "text-lg font-semibold",
          isSecure ? "text-success" : "text-destructive"
        )}>
          {isSecure ? "Kasa Güvende" : "Kasa Bozuk"}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          Bu ay {missedWorkouts}/{totalWorkouts} kaçırıldı
        </p>
      </div>
    </div>
  );
}
