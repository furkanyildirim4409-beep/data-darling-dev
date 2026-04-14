import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSendEmail } from "@/hooks/useEmails";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface ComposeMailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComposeMailDialog({ open, onOpenChange }: ComposeMailDialogProps) {
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const sendEmail = useSendEmail();

  const handleSend = () => {
    if (!toEmail || !subject) {
      toast.error("Lütfen alıcı ve konu alanlarını doldurun.");
      return;
    }
    sendEmail.mutate(
      { toEmail, subject, bodyText },
      {
        onSuccess: () => {
          toast.success("E-posta gönderildi!");
          setToEmail("");
          setSubject("");
          setBodyText("");
          onOpenChange(false);
        },
        onError: () => {
          toast.error("E-posta gönderilemedi.");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Mail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">Kime</Label>
            <Input
              id="to"
              type="email"
              placeholder="ornek@mail.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Konu</Label>
            <Input
              id="subject"
              placeholder="E-posta konusu"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Mesaj</Label>
            <Textarea
              id="body"
              placeholder="Mesajınızı yazın..."
              rows={8}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
            />
          </div>
          <Button onClick={handleSend} disabled={sendEmail.isPending} className="w-full gap-2">
            <Send className="w-4 h-4" />
            {sendEmail.isPending ? "Gönderiliyor..." : "Gönder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
