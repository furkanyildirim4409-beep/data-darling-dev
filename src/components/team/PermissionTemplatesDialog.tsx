import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PermissionMatrix } from './PermissionMatrix';
import {
  usePermissionTemplates,
  useCreatePermissionTemplate,
  useUpdatePermissionTemplate,
  useDeletePermissionTemplate,
  type PermissionTemplate,
} from '@/hooks/usePermissionTemplates';
import { getDefaultPermissions, type GranularPermissions } from '@/types/permissions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PermissionTemplatesDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: templates = [], isLoading } = usePermissionTemplates();
  const createMutation = useCreatePermissionTemplate();
  const updateMutation = useUpdatePermissionTemplate();
  const deleteMutation = useDeletePermissionTemplate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<GranularPermissions>(getDefaultPermissions('read-only'));

  // Sync editor when selecting a template
  useEffect(() => {
    if (selectedId && !isNew) {
      const tpl = templates.find((t) => t.id === selectedId);
      if (tpl) {
        setName(tpl.name);
        setPermissions(tpl.permissions);
      }
    }
  }, [selectedId, templates, isNew]);

  const handleNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setName('');
    setPermissions(getDefaultPermissions('read-only'));
  };

  const handleSelect = (tpl: PermissionTemplate) => {
    setIsNew(false);
    setSelectedId(tpl.id);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Hata', description: 'Şablon adı boş olamaz.', variant: 'destructive' });
      return;
    }

    try {
      if (isNew) {
        const result = await createMutation.mutateAsync({ name: name.trim(), permissions });
        setIsNew(false);
        setSelectedId(result.id);
        toast({ title: 'Şablon Oluşturuldu', description: `"${name}" başarıyla kaydedildi.` });
      } else if (selectedId) {
        await updateMutation.mutateAsync({ id: selectedId, name: name.trim(), permissions });
        toast({ title: 'Şablon Güncellendi', description: `"${name}" başarıyla güncellendi.` });
      }
    } catch {
      toast({ title: 'Hata', description: 'İşlem sırasında bir hata oluştu.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await deleteMutation.mutateAsync(selectedId);
      setSelectedId(null);
      setIsNew(false);
      toast({ title: 'Şablon Silindi', description: 'Şablon başarıyla kaldırıldı.' });
    } catch {
      toast({ title: 'Hata', description: 'Silme işlemi başarısız.', variant: 'destructive' });
    }
  };

  const isEditing = isNew || !!selectedId;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Yetki Şablonları</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-64 border-r border-border flex flex-col">
            <div className="p-3">
              <Button onClick={handleNew} size="sm" className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Şablon Ekle
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-2 pb-2 space-y-1">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelect(tpl)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2',
                      selectedId === tpl.id && !isNew
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tpl.name}</span>
                  </button>
                ))}
                {!isLoading && templates.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6 px-2">
                    Henüz şablon yok. Yeni bir şablon oluşturun.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col min-h-0">
            {isEditing ? (
              <>
                <div className="px-6 pt-4 pb-3 space-y-3">
                  <Input
                    placeholder="Şablon Adı (ör. Diyetisyen, Asistan Koç)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-base font-medium"
                  />
                </div>
                <ScrollArea className="flex-1 px-6">
                  <div className="pb-6">
                    <PermissionMatrix value={permissions} onChange={setPermissions} />
                  </div>
                </ScrollArea>
                <Separator />
                <div className="px-6 py-3 flex items-center justify-between">
                  {!isNew && selectedId ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Sil
                    </Button>
                  ) : (
                    <div />
                  )}
                  <Button onClick={handleSave} size="sm" disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isNew ? 'Oluştur' : 'Kaydet'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Düzenlemek için bir şablon seçin veya yeni oluşturun.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
