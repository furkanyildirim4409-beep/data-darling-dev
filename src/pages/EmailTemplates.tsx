import { useState } from "react";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TemplateForm {
  id?: string;
  name: string;
  subject: string;
  body_html: string;
}

const empty: TemplateForm = { name: "", subject: "", body_html: "" };

export default function EmailTemplates() {
  const { templates, isLoading } = useEmailTemplates();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TemplateForm>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => { setForm(empty); setDialogOpen(true); };
  const openEdit = (t: any) => {
    setForm({ id: t.id, name: t.name, subject: t.subject, body_html: t.body_html });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim()) {
      toast.error("Şablon adı ve konu zorunludur.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const { error } = await supabase.from("email_templates").update({
          name: form.name, subject: form.subject, body_html: form.body_html,
        }).eq("id", form.id);
        if (error) throw error;
        toast.success("Şablon güncellendi.");
      } else {
        const { error } = await supabase.from("email_templates").insert({
          name: form.name, subject: form.subject, body_html: form.body_html,
          owner_id: user!.id, is_system: false,
        });
        if (error) throw error;
        toast.success("Şablon oluşturuldu.");
      }
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("email_templates").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); } else {
      toast.success("Şablon silindi.");
      qc.invalidateQueries({ queryKey: ["email-templates"] });
    }
    setDeleteId(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mail Şablonları</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Yeni Şablon</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Yükleniyor…</p>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground">Henüz şablon yok.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  {t.is_system && <Badge variant="secondary" className="shrink-0">Sistem Şablonu</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{t.subject}</p>
                {!t.is_system && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" />Düzenle
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />Sil
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Şablonu Düzenle" : "Yeni Şablon"}</DialogTitle>
            <DialogDescription>Mail şablonunuzu oluşturun veya düzenleyin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Şablon Adı</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hoş Geldin Maili" />
            </div>
            <div>
              <Label>Mail Konusu</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Hoş Geldiniz, {{isim}}!" />
            </div>
            <div>
              <Label>Mail İçeriği (HTML)</Label>
              <Textarea rows={6} value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })} placeholder="<p>Merhaba {{isim}},</p>" />
              <p className="text-xs text-muted-foreground mt-1">Dinamik değişken: <code className="bg-muted px-1 rounded">{"{{isim}}"}</code></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Şablonu Sil</AlertDialogTitle>
            <AlertDialogDescription>Bu şablonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
