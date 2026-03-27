import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Coins, Scale, ImageOff, Loader2 } from "lucide-react";
import { useResolveDispute } from "@/hooks/useResolveDispute";

interface DisputeResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: any;
}

const isVideo = (url?: string) =>
  url ? /\.(mp4|mov|webm|avi)/i.test(url) : false;

function ProofMedia({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-secondary/20 p-10 text-muted-foreground">
        <ImageOff className="w-8 h-8" />
        <span className="text-sm font-medium">Kanıt Yüklenmedi</span>
      </div>
    );
  }
  if (isVideo(url)) {
    return (
      <video
        controls
        src={url}
        className="w-full rounded-lg max-h-[400px] object-contain bg-black/50"
      />
    );
  }
  return (
    <img
      src={url}
      alt="Kanıt"
      className="w-full rounded-lg max-h-[400px] object-contain bg-black/50"
    />
  );
}

export default function DisputeResolutionModal({
  isOpen,
  onClose,
  dispute,
}: DisputeResolutionModalProps) {
  const { resolveDispute, isResolving } = useResolveDispute(onClose);

  if (!dispute) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg font-bold">
              {dispute.exercise_name || dispute.challenge_type}
            </DialogTitle>
            {dispute.wager_coins > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                <Coins className="w-3 h-3" />
                {dispute.wager_coins}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Side-by-side evidence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {/* Challenger */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-primary/30">
                <AvatarImage src={dispute.challengerAvatar || ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {dispute.challengerName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{dispute.challengerName}</p>
                <p className="text-xs text-muted-foreground">
                  İddia: {dispute.challenger_value ?? "—"}
                </p>
              </div>
            </div>
            <ProofMedia url={dispute.proof_url} />
          </div>

          {/* Opponent */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-destructive/30">
                <AvatarImage src={dispute.opponentAvatar || ""} />
                <AvatarFallback className="text-xs bg-destructive/10 text-destructive">
                  {dispute.opponentName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{dispute.opponentName}</p>
                <p className="text-xs text-muted-foreground">
                  İddia: {dispute.opponent_value ?? "—"}
                </p>
              </div>
            </div>
            <ProofMedia url={dispute.opponent_proof_url} />
          </div>
        </div>

        {/* Verdict buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            className="flex-1 border-primary text-primary hover:bg-primary/10"
            disabled={isResolving}
            onClick={() =>
              resolveDispute({
                p_challenge_id: dispute.id,
                p_winner_id: dispute.challenger_id,
                p_is_draw: false,
              })
            }
          >
            {isResolving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Scale className="w-4 h-4 mr-1.5" />}
            Sol (Challenger) Kazandı
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-muted-foreground"
            disabled={isResolving}
            onClick={() =>
              resolveDispute({
                p_challenge_id: dispute.id,
                p_winner_id: null,
                p_is_draw: true,
              })
            }
          >
            Berabere (İptal Et)
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
            disabled={isResolving}
            onClick={() =>
              resolveDispute({
                p_challenge_id: dispute.id,
                p_winner_id: dispute.opponent_id,
                p_is_draw: false,
              })
            }
          >
            {isResolving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Scale className="w-4 h-4 mr-1.5" />}
            Sağ (Rakip) Kazandı
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
