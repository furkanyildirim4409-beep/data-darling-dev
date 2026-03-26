import { Scale, Coins } from "lucide-react";
import { useDisputes } from "@/hooks/useDisputes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Disputes() {
  const { data: disputes, isLoading } = useDisputes();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Scale className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yüce Divan</h1>
          <p className="text-sm text-muted-foreground">
            İtiraz edilen düelloları inceleyin ve karar verin
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && disputes?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Scale className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Adalet sağlandı</h2>
          <p className="text-muted-foreground max-w-sm">
            Şu an itiraz edilen bir düello yok.
          </p>
        </div>
      )}

      {/* Dispute Cards */}
      {!isLoading && disputes && disputes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {disputes.map((d: any) => (
            <Card
              key={d.id}
              className="border-border/50 hover:border-primary/30 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold truncate">
                    {d.exercise_name || d.challenge_type}
                  </CardTitle>
                  {d.wager_coins > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                      <Coins className="w-3 h-3" />
                      {d.wager_coins}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* VS Layout */}
                <div className="flex items-center justify-between gap-2">
                  {/* Challenger */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                    <Avatar className="w-11 h-11 border-2 border-primary/30">
                      <AvatarImage src={d.challengerAvatar || ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {d.challengerName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate w-full text-center">
                      {d.challengerName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      İddia: {d.challenger_value ?? "—"}
                    </span>
                  </div>

                  {/* VS */}
                  <div className="shrink-0">
                    <span className="text-xs font-black text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                      VS
                    </span>
                  </div>

                  {/* Opponent */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                    <Avatar className="w-11 h-11 border-2 border-destructive/30">
                      <AvatarImage src={d.opponentAvatar || ""} />
                      <AvatarFallback className="text-xs bg-destructive/10 text-destructive">
                        {d.opponentName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate w-full text-center">
                      {d.opponentName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      İddia: {d.opponent_value ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => console.log("Review dispute:", d.id)}
                >
                  <Scale className="w-4 h-4 mr-1.5" />
                  İncele ve Karar Ver
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
