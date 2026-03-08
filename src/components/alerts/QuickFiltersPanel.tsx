import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  CreditCard, 
  Calendar, 
  MessageSquare,
  Flame,
  AlertTriangle
} from "lucide-react";

export type QuickFilter = "all" | "health" | "payment" | "program" | "checkin";

interface QuickFiltersPanelProps {
  activeFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
  counts: {
    health: number;
    payment: number;
    program: number;
    checkin: number;
  };
}

const filters = [
  {
    id: "health" as QuickFilter,
    label: "Kritik Sağlık",
    description: "Sakatlanma riski yüksek",
    icon: Activity,
    color: "text-destructive",
    bgColor: "bg-destructive/10 border-destructive/30 hover:border-destructive/50",
  },
  {
    id: "payment" as QuickFilter,
    label: "Ödeme Sorunları",
    description: "Gecikmiş ödemeler",
    icon: CreditCard,
    color: "text-warning",
    bgColor: "bg-warning/10 border-warning/30 hover:border-warning/50",
  },
  {
    id: "program" as QuickFilter,
    label: "Programı Bitenler",
    description: "7 gün içinde biten",
    icon: Calendar,
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/30 hover:border-primary/50",
  },
  {
    id: "checkin" as QuickFilter,
    label: "Check-in Yapmayanlar",
    description: "3+ gündür sessiz",
    icon: MessageSquare,
    color: "text-orange-400",
    bgColor: "bg-orange-400/10 border-orange-400/30 hover:border-orange-400/50",
  },
];

export function QuickFiltersPanel({ activeFilter, onFilterChange, counts }: QuickFiltersPanelProps) {
  return (
    <div className="glass rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Hızlı Filtreler</h3>
      </div>
      
      <div className="space-y-2">
        <Button
          variant="ghost"
          onClick={() => onFilterChange("all")}
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-foreground transition-all",
            activeFilter === "all" && "bg-secondary text-foreground"
          )}
        >
          <AlertTriangle className="w-4 h-4 mr-3" />
          Tüm Uyarılar
        </Button>
        
        {filters.map((filter) => {
          const Icon = filter.icon;
          const count = counts[filter.id];
          
          return (
            <Button
              key={filter.id}
              variant="ghost"
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "w-full justify-start transition-all group",
                activeFilter === filter.id 
                  ? cn("border", filter.bgColor, filter.color)
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 mr-3", activeFilter === filter.id && filter.color)} />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{filter.label}</div>
                <div className="text-xs text-muted-foreground">{filter.description}</div>
              </div>
              {count > 0 && (
                <span className={cn(
                  "font-mono text-sm px-2 py-0.5 rounded",
                  activeFilter === filter.id ? filter.color : "text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
