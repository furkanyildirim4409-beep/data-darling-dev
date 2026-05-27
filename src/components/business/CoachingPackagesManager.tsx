import { useState } from "react";
import { Plus, Check, Trash2, Edit, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCoachPackages, type CoachingPackage } from "@/hooks/useCoachPackages";
import { usePermissions } from "@/hooks/usePermissions";
import { PackageFormDialog } from "./PackageFormDialog";

export function CoachingPackagesManager() {
  const { packages, isLoading, createPackage, updatePackage, deletePackage } = useCoachPackages();
  const { canManageFinances } = usePermissions();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CoachingPackage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (pkg: CoachingPackage) => {
    setEditing(pkg);
    setFormOpen(true);
  };

  const handleSubmit = async (values: Parameters<typeof createPackage>[0]) => {
    if (editing) return await updatePackage(editing.id, values);
    return await createPackage(values);
  };

  return (
    <div className="glass rounded-xl border border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Koçluk Paketlerim</h2>
            <p className="text-xs text-muted-foreground">
              {packages.length} aktif paket konfigürasyonu
            </p>
          </div>
        </div>
        {canManageFinances && (
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Paket Ekle
          </Button>
        )}
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="py-12 text-center">
            <Coins className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Henüz paket oluşturmadın</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              "Yeni Paket Ekle" butonuyla ilk koçluk paketini yapılandır
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex flex-col gap-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{pkg.title}</h3>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {pkg.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      pkg.is_active
                        ? "bg-success/10 text-success border-success/20 text-[10px]"
                        : "bg-muted/30 text-muted-foreground border-border text-[10px]"
                    }
                  >
                    {pkg.is_active ? "Aktif" : "Pasif"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary/15 text-primary border-primary/30 font-mono text-xs">
                    {Number(pkg.price).toLocaleString("tr-TR")} ₺ / Ay
                  </Badge>
                  <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                    {pkg.duration_months} Ay
                  </Badge>
                </div>

                {pkg.features.length > 0 && (
                  <ul className="space-y-1.5 mt-1">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                        <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        <span className="leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {canManageFinances && (
                  <div className="flex items-center justify-end gap-1 pt-2 mt-auto border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => openEdit(pkg)}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(pkg.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PackageFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialPackage={editing}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Paketi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu koçluk paketini silmek istediğine emin misin? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deletePackage(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
