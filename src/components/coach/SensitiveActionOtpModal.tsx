import * as React from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export interface SensitiveActionOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  actionName: string;
  athleteName: string;
  isLoading: boolean;
}

export function SensitiveActionOtpModal({
  isOpen,
  onClose,
  onVerify,
  actionName,
  athleteName,
  isLoading,
}: SensitiveActionOtpModalProps) {
  const [code, setCode] = React.useState("");
  const submittedCodeRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setCode("");
      submittedCodeRef.current = null;
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (code.length < 6) {
      submittedCodeRef.current = null;
      return;
    }

    if (code.length === 6 && !isLoading && submittedCodeRef.current !== code) {
      submittedCodeRef.current = code;
      void onVerify(code);
    }
  }, [code, isLoading, onVerify]);

  const handleManualVerify = async () => {
    if (code.length === 6 && !isLoading) {
      submittedCodeRef.current = code;
      await onVerify(code);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md border border-border bg-card/95 text-foreground shadow-2xl backdrop-blur-md"
        style={{ "--ring": "68 100% 50%" } as React.CSSProperties}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-lime-neon" />
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Güvenlik Doğrulaması
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">{athleteName}</span>{" "}
            adlı sporcu için{" "}
            <span className="font-medium text-foreground">{actionName}</span>{" "}
            işlemi başlattınız. Lütfen e-postanıza gönderilen 6 haneli güvenlik
            kodunu girin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-2">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value: string) => setCode(value)}
            disabled={isLoading}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="border-border bg-background/50 text-foreground text-lg font-mono transition-colors duration-150 focus:bg-background"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <Button
            onClick={handleManualVerify}
            disabled={code.length !== 6 || isLoading}
            className="w-full h-11 bg-lime-neon text-black font-semibold hover:bg-lime-neon/90 transition-colors disabled:opacity-40"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Doğrulanıyor…
              </>
            ) : (
              "Doğrula"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
