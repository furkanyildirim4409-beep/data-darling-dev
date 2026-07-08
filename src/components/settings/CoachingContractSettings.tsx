import { useEffect, useState } from "react";
import { FileText, Loader2, RotateCcw, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import RichTextEditor from "@/components/mailbox/RichTextEditor";
import { useCoachContract } from "@/hooks/useCoachContract";
import { DEFAULT_COACHING_CONTRACT_HTML } from "@/lib/defaultCoachingContract";

export function CoachingContractSettings() {
  const { contract, updatedAt, isLoading, isSaving, hasContract, canEdit, saveContract } =
    useCoachContract();
  const [value, setValue] = useState<string>("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setValue(contract && contract.trim().length > 0 ? contract : DEFAULT_COACHING_CONTRACT_HTML);
  }, [contract, isLoading]);

  const handleSave = async () => {
    await saveContract(value);
  };

  const handleLoadDefault = () => {
    setValue(DEFAULT_COACHING_CONTRACT_HTML);
    setConfirmReset(false);
  };

  return (
    <div className="glass rounded-xl border border-border p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Koçluk Sözleşmesi</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sporcular paketinizi satın alırken bu şablon onaylarına sunulur. Paket satışı yapabilmek
            için sözleşme şablonunuzun kaydedilmiş olması <strong>zorunludur</strong>.
          </p>
        </div>
      </div>

      {!hasContract && !isLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sözleşme şablonu kaydedilmemiş</AlertTitle>
          <AlertDescription>
            Aşağıdaki varsayılan taslağı inceleyip düzenleyin, ardından <strong>Kaydet</strong>{" "}
            butonuna basın. Şablon kaydedilmeden paket yayınlayamazsınız.
          </AlertDescription>
        </Alert>
      )}

      {hasContract && (
        <Alert className="border-success/30 bg-success/5">
          <ShieldCheck className="h-4 w-4 text-success" />
          <AlertTitle className="text-success">Sözleşme şablonu aktif</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            {updatedAt
              ? `Son güncelleme: ${new Date(updatedAt).toLocaleString("tr-TR")}`
              : "Şablonunuz yayında."}
          </AlertDescription>
        </Alert>
      )}

      {!canEdit && (
        <Alert>
          <AlertDescription>
            Sözleşme şablonu yalnızca <strong>baş antrenör</strong> tarafından düzenlenebilir. Aşağıda
            aktif şablonu görüntülüyorsunuz.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
        </div>
      ) : (
        <div className={canEdit ? "" : "pointer-events-none opacity-70"}>
          <RichTextEditor value={value} onChange={setValue} />
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmReset(true)}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Varsayılan Şablonu Yükle
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Sözleşmeyi Kaydet"
            )}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Varsayılan şablonla değiştirilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Mevcut düzenlemeleriniz kaybolacaktır. Devam etmek istiyor musunuz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleLoadDefault}
            >
              Evet, Yükle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
