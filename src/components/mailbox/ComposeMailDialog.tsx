import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useSendEmail } from "@/hooks/useEmails";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { toast } from "sonner";
import { Send } from "lucide-react";
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ComposeMailDialog({ open, onOpenChange }: Props) {
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const sendEmail = useSendEmail();
  const { templates } = useEmailTemplates();

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      // Strip HTML tags for textarea display
      const text = tpl.body_html.replace(/<[^>]*>/g, "\n").replace(/\n{2,}/g, "\n").trim();
      setBodyText(text);
    }
  };

  const handleSend = () => {
    if (!toEmail || !subject || !bodyText) {
      toast.error("Tüm alanları doldurun.");
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
          <div className="space-y-1.5">
            <Label htmlFor="to">Kime</Label>
            <Input id="to" type="email" placeholder="ornek@email.com" value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Konu</Label>
            <Input id="subject" placeholder="Konu" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Mesaj</Label>
            <Textarea id="body" placeholder="Mesajınızı yazın..." rows={8} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
          </div>
          <Button className="w-full gap-2" onClick={handleSend} disabled={sendEmail.isPending}>
            <Send className="w-4 h-4" />
            {sendEmail.isPending ? "Gönderiliyor..." : "Gönder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
