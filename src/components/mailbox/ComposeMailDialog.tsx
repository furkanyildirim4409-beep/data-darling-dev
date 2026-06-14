import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useSendEmail } from "@/hooks/useEmails";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { useAthletes } from "@/hooks/useAthletes";
import RichTextEditor from "./RichTextEditor";
import { toast } from "sonner";
import { Send } from "lucide-react";

export interface ComposePrefill {
  toEmail?: string;
  subject?: string;
  bodyHtml?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: ComposePrefill;
}

const MANUAL_RECIPIENT = "__manual__";

export default function ComposeMailDialog({ open, onOpenChange, prefill }: Props) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(MANUAL_RECIPIENT);
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const sendEmail = useSendEmail();
  const { templates } = useEmailTemplates();
  const { athletes } = useAthletes();

  const athletesWithEmail = useMemo(
    () => (athletes ?? []).filter((a) => !!a.email),
    [athletes],
  );

  const selectedAthlete = useMemo(
    () => athletesWithEmail.find((a) => a.id === selectedAthleteId) ?? null,
    [athletesWithEmail, selectedAthleteId],
  );
  const selectedAthleteName = selectedAthlete?.name ?? "";

  // Seed from prefill when dialog opens
  useEffect(() => {
    if (!open) return;
    if (prefill) {
      setSelectedAthleteId(MANUAL_RECIPIENT);
      setToEmail(prefill.toEmail ?? "");
      setSubject(prefill.subject ?? "");
      setBodyHtml(prefill.bodyHtml ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  const handleAthleteChange = (val: string) => {
    setSelectedAthleteId(val);
    if (val === MANUAL_RECIPIENT) {
      setToEmail("");
    } else {
      const a = athletesWithEmail.find((x) => x.id === val);
      if (a?.email) setToEmail(a.email);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setBodyHtml(tpl.body_html);
    }
  };

  const reset = () => {
    setSelectedAthleteId(MANUAL_RECIPIENT);
    setToEmail("");
    setSubject("");
    setBodyHtml("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSend = () => {
    if (!toEmail || !subject || !bodyHtml || stripTags(bodyHtml).length === 0) {
      toast.error("Tüm alanları doldurun.");
      return;
    }
    const fallback = selectedAthleteName || "Sporcu";
    const finalSubject = subject.replace(/\{\{isim\}\}/g, fallback);
    const finalHtml = bodyHtml.replace(/\{\{isim\}\}/g, fallback);

    sendEmail.mutate(
      { toEmail, subject: finalSubject, bodyHtml: finalHtml },
      {
        onSuccess: () => {
          toast.success("E-posta gönderildi!");
          reset();
          onOpenChange(false);
        },
        onError: () => toast.error("E-posta gönderilemedi."),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Mail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Sporcu Seç</Label>
            <Select value={selectedAthleteId} onValueChange={handleAthleteChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sporcu seçin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL_RECIPIENT}>Manuel e-posta gir</SelectItem>
                {athletesWithEmail.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {a.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Şablon Seç (İsteğe Bağlı)</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Şablon seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}{tpl.is_system ? " (Sistem)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Şablon içinde <code>{"{{isim}}"}</code> etiketi seçili sporcunun adı ile değiştirilir.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="to">Kime</Label>
            <Input
              id="to"
              type="email"
              placeholder="ornek@email.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              disabled={selectedAthleteId !== MANUAL_RECIPIENT}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Konu</Label>
            <Input id="subject" placeholder="Konu" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Mesaj</Label>
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
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

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}
