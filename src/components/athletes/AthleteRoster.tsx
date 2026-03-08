import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Athlete } from "@/types/shared-models";
import { AthleteTableRow } from "./AthleteTableRow";
import { QuickChatPopover } from "./QuickChatPopover";
import { Search, AlertTriangle, Clock, Calendar, X } from "lucide-react";

type FilterType = "all" | "high-risk" | "missed-checkin" | "expiring";

interface AthleteRosterProps {
  athletes: Athlete[];
  isLoading?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </td>
      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
      <td className="py-3 px-4"><Skeleton className="h-6 w-12" /></td>
      <td className="py-3 px-4"><Skeleton className="h-5 w-16" /></td>
      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
      <td className="py-3 px-4"><Skeleton className="h-8 w-24" /></td>
    </tr>
  );
}

export function AthleteRoster({ athletes, isLoading = false }: AthleteRosterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [chatAthlete, setChatAthlete] = useState<Athlete | null>(null);

  const filters: { id: FilterType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "all", label: "Tüm Sporcular", icon: null, count: athletes.length },
    {
      id: "high-risk",
      label: "Yüksek Risk",
      icon: <AlertTriangle className="w-3 h-3" />,
      count: athletes.filter((a) => a.injuryRisk === "High").length,
    },
    {
      id: "missed-checkin",
      label: "Kaçırılan Check-in",
      icon: <Clock className="w-3 h-3" />,
      count: athletes.filter((a) => a.checkInStatus === "missed").length,
    },
    {
      id: "expiring",
      label: "Süresi Doluyor",
      icon: <Calendar className="w-3 h-3" />,
      count: athletes.filter((a) => {
        const expiry = new Date(a.subscriptionExpiry);
        const diffDays = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
        return diffDays <= 3 && diffDays > 0;
      }).length,
    },
  ];

  const filteredAthletes = useMemo(() => {
    let result = athletes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.sport.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      );
    }
    switch (activeFilter) {
      case "high-risk":
        result = result.filter((a) => a.injuryRisk === "High");
        break;
      case "missed-checkin":
        result = result.filter((a) => a.checkInStatus === "missed");
        break;
      case "expiring":
        result = result.filter((a) => {
          const diffDays = Math.ceil((new Date(a.subscriptionExpiry).getTime() - Date.now()) / 86400000);
          return diffDays <= 3 && diffDays > 0;
        });
        break;
    }
    return result;
  }, [athletes, searchQuery, activeFilter]);

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sporcu ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((filter) => (
            <Badge
              key={filter.id}
              variant="outline"
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5 text-sm",
                activeFilter === filter.id
                  ? filter.id === "high-risk"
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : filter.id === "missed-checkin"
                    ? "bg-warning/10 text-warning border-warning/30"
                    : filter.id === "expiring"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : "bg-primary/10 text-primary border-primary/30"
                  : "hover:bg-secondary"
              )}
            >
              {filter.icon}
              <span className="ml-1">{filter.label}</span>
              <span className="ml-1.5 font-mono text-xs opacity-70">({filter.count})</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sporcu</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uyumluluk</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hazırlık</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sakatlanma Riski</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Son Aktivite</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : filteredAthletes.map((athlete) => (
                    <AthleteTableRow
                      key={athlete.id}
                      athlete={athlete}
                      onMessage={(a) => setChatAthlete(a)}
                      onViewProfile={(a) => console.log("View", a.name)}
                    />
                  ))}
            </tbody>
          </table>
        </div>
        {!isLoading && filteredAthletes.length === 0 && athletes.length > 0 && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Kriterlerinize uygun sporcu bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {!isLoading && athletes.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            <span className="font-mono text-foreground">{filteredAthletes.length}</span> /{" "}
            <span className="font-mono text-foreground">{athletes.length}</span> sporcu gösteriliyor
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Düşük Risk: {athletes.filter((a) => a.injuryRisk === "Low").length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span>Orta: {athletes.filter((a) => a.injuryRisk === "Medium").length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span>Yüksek: {athletes.filter((a) => a.injuryRisk === "High").length}</span>
            </div>
          </div>
        </div>
      )}

      {chatAthlete && (
        <QuickChatPopover athlete={chatAthlete} onClose={() => setChatAthlete(null)} />
      )}
    </div>
  );
}
