import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, Mail, Zap, Users, Copy, Check, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AthleteRoster } from "@/components/athletes/AthleteRoster";
import { RapidResponse } from "@/components/athletes/RapidResponse";
import { useAthletes } from "@/hooks/useAthletes";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export default function Athletes() {
  const { user, isSubCoach, teamMemberPermissions } = useAuth();
  const { athletes, isLoading, error, refetch } = useAthletes();
  const [showRapidResponse, setShowRapidResponse] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

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
      const { data, error: rpcError } = await supabase.rpc(
        "link_athlete_to_coach" as any,
        { _coach_id: user.id, _athlete_email: linkEmail.trim() }
      );

      if (rpcError) throw rpcError;

      const result = data as any;
      const status = result?.status;

      if (status === "not_found") {
        toast.error("Bu e-posta adresiyle kayıtlı bir sporcu bulunamadı.");
      } else if (status === "already_linked") {
        toast.warning("Bu sporcu zaten başka bir koça bağlı.");
      } else if (status === "already_yours") {
        toast.info("Bu sporcu zaten kadronuzda.");
      } else if (status === "ok") {
        toast.success("Sporcu başarıyla kadronuza eklendi!");
        setAddDialogOpen(false);
        setLinkEmail("");
        refetch();
      }
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!user) return;
    setIsGeneratingInvite(true);
    try {
      const { data, error: insertError } = await supabase
        .from("coach_invites" as any)
        .insert({ coach_id: user.id } as any)
        .select("token")
        .single();

      if (insertError) throw insertError;

      const token = (data as any)?.token;
      const link = `${window.location.origin}/register?invite=${token}`;
      setInviteLink(link);
      setCopied(false);
    } catch (err: any) {
      toast.error(err.message || "Davet linki oluşturulamadı.");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (showRapidResponse) {
    return <RapidResponse onClose={() => setShowRapidResponse(false)} />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Sporcular</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm md:text-base text-muted-foreground">
              {isLoading ? <Skeleton className="h-4 w-32 inline-block" /> : (
                <><span className="font-mono text-foreground">{athletes.length}</span> sporcu yönetiliyor</>
              )}
            </p>
            {isSubCoach && teamMemberPermissions !== 'full' && !isLoading && (
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-xs gap-1">
                <Filter className="w-3 h-3" />
                Atanan Sporcular
              </Badge>
            )}
          </div>
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

          {/* Invite Link Dialog */}
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-border text-xs md:text-sm">
                <Copy className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Davet Linki</span>
                <span className="sm:hidden">Davet</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/50 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <Link className="w-5 h-5 text-primary" />Davet Linki Oluştur
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Bu linki sporcunuza gönderin. Kayıt olduğunda otomatik olarak kadronuza eklenir.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {!inviteLink ? (
                  <Button onClick={handleGenerateInvite} disabled={isGeneratingInvite} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    {isGeneratingInvite ? "Oluşturuluyor..." : "Link Oluştur"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input value={inviteLink} readOnly className="bg-black/50 border-white/10 text-xs" />
                      <Button size="icon" variant="outline" onClick={handleCopyLink} className="border-white/10 shrink-0">
                        {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Bu link 7 gün geçerlidir ve yalnızca bir kez kullanılabilir.</p>
                    <Button variant="outline" onClick={() => { setInviteLink(""); handleGenerateInvite(); }} className="w-full border-white/10">
                      Yeni Link Oluştur
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Link Athlete Dialog */}
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
          <p className="text-sm text-muted-foreground mb-4">Sporcularınızı davet edin veya e-posta ile bağlayın.</p>
        </div>
      )}
    </div>
  );
}
