import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, Mail, Zap, Users } from "lucide-react";
import { AthleteRoster } from "@/components/athletes/AthleteRoster";
import { RapidResponse } from "@/components/athletes/RapidResponse";
import { useAthletes } from "@/hooks/useAthletes";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { mockAthletes } from "@/data/athletes";

const ATHLETES_STORAGE_KEY = "dynabolic_athletes";

export default function Athletes() {
  const { user } = useAuth();
  const { athletes, isLoading, error, refetch } = useAthletes();
  const [showRapidResponse, setShowRapidResponse] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const athletesNeedingAttention = athletes.filter(
    (a) => a.injuryRisk === "High" || a.checkInStatus === "missed" || a.compliance < 60
  );

  const handleLinkAthlete = async () => {
    if (!linkEmail.trim() || !user) {
      toast.error("Lütfen bir e-posta adresi girin.");
      return;
    }
    setIsLinking(true);
    try {
      const match = mockAthletes.find(a => a.email.toLowerCase() === linkEmail.trim().toLowerCase());
      if (!match) {
        toast.error("Bu e-posta adresiyle kayıtlı bir öğrenci bulunamadı.");
        return;
      }
      const current = JSON.parse(localStorage.getItem(ATHLETES_STORAGE_KEY) || '[]') as any[];
      if (current.find((a: any) => a.email.toLowerCase() === linkEmail.trim().toLowerCase())) {
        toast.info("Bu öğrenci zaten kadronuzda.");
        return;
      }
      current.push(match);
      localStorage.setItem(ATHLETES_STORAGE_KEY, JSON.stringify(current));
      toast.success("Öğrenci başarıyla kadronuza eklendi!");
      setAddDialogOpen(false);
      setLinkEmail("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
    } finally {
      setIsLinking(false);
    }
  };

  if (showRapidResponse) {
    return <RapidResponse onClose={() => setShowRapidResponse(false)} />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Sporcular</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {isLoading ? <Skeleton className="h-4 w-32 inline-block" /> : (
              <><span className="font-mono text-foreground">{athletes.length}</span> sporcu yönetiliyor</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {athletesNeedingAttention.length > 0 && (
            <Button onClick={() => setShowRapidResponse(true)} variant="outline" size="sm" className="border-warning/30 text-warning hover:bg-warning/10 hover:text-warning text-xs md:text-sm">
              <Zap className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Odak Modu</span>
              <span className="sm:hidden">Odak</span>
              <span className="ml-1 md:ml-2 font-mono bg-warning/20 px-1.5 md:px-2 py-0.5 rounded text-xs">{athletesNeedingAttention.length}</span>
            </Button>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm">
                <Link className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Sporcu Bağla</span>
                <span className="sm:hidden">Bağla</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/50 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <Link className="w-5 h-5 text-primary" />Sporcu Bağla
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">Kayıtlı sporcunun e-posta adresini girin</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="sporcu@email.com" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLinkAthlete()} className="pl-10 bg-black/50 border-white/10 focus:border-primary" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="flex-1 border-white/10">İptal</Button>
                  <Button onClick={handleLinkAthlete} disabled={isLinking || !linkEmail.trim()} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link className="w-4 h-4 mr-2" />{isLinking ? "Bağlanıyor..." : "Bağlantı Kur"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!isLoading && athletesNeedingAttention.length > 0 && (
        <div className="glass rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{athletesNeedingAttention.length} sporcu dikkat gerektiriyor</p>
                <p className="text-sm text-muted-foreground">Yüksek risk, kaçırılan check-in veya düşük uyumluluk tespit edildi</p>
              </div>
            </div>
            <Button onClick={() => setShowRapidResponse(true)} className="bg-warning text-warning-foreground hover:bg-warning/90">
              <Zap className="w-4 h-4 mr-2" />Odak Modunu Başlat
            </Button>
          </div>
        </div>
      )}

      <AthleteRoster athletes={athletes} isLoading={isLoading} />

      {!isLoading && athletes.length === 0 && !error && (
        <div className="glass rounded-xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Henüz sporcu yok</h3>
          <p className="text-sm text-muted-foreground mb-4">Sporcularınız sisteme kaydolduğunda burada görünecek.</p>
        </div>
      )}
    </div>
  );
}
