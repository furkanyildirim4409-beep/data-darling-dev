import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pill, X } from "lucide-react";

export interface SupplementBuilderItem {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  icon: string;
  category?: string;
}

interface SupplementBuilderProps {
  items: SupplementBuilderItem[];
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, field: keyof SupplementBuilderItem, value: string) => void;
  onClearAll: () => void;
}

const TIMING_OPTIONS = [
  { value: "Sabah", label: "☀️ Sabah" },
  { value: "Antrenman Öncesi", label: "⚡ Antrenman Öncesi" },
  { value: "Antrenman Sonrası", label: "💪 Antrenman Sonrası" },
  { value: "Öğün Arası", label: "🕐 Öğün Arası" },
  { value: "Yatmadan Önce", label: "🌙 Yatmadan Önce" },
];

export function SupplementBuilder({ items, onRemoveItem, onUpdateItem, onClearAll }: SupplementBuilderProps) {
  return (
    <div className="glass rounded-xl border border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Pill className="w-5 h-5 text-purple-400" />
            Takviye Oluşturucu
          </h2>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Temizle
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Kütüphaneden takviye eklemek için "+" butonuna tıklayın</p>
      </div>

      {/* Summary */}
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground">Takviye Listesi</span>
          <Badge variant="secondary" className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">
            {items.length} takviye
          </Badge>
        </div>
      </div>

      {/* Items */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {items.length === 0 ? (
            <div className="border border-dashed border-border/60 rounded-lg p-8 text-center">
              <Pill className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Henüz takviye eklenmedi</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sol paneldeki kütüphaneden takviye ekleyin
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="glass rounded-lg p-3 border border-border group hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.category && (
                      <p className="text-[10px] text-muted-foreground">{item.category}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Dozaj</label>
                    <Input
                      value={item.dosage}
                      onChange={(e) => onUpdateItem(item.id, "dosage", e.target.value)}
                      placeholder="Örn: 5g, 2 kapsül"
                      className="h-8 text-xs bg-background/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Zamanlama</label>
                    <Select value={item.timing} onValueChange={(v) => onUpdateItem(item.id, "timing", v)}>
                      <SelectTrigger className="h-8 text-xs bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMING_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground text-center">
          {items.length > 0
            ? `${items.length} takviye programda`
            : "Takviye ekleyerek başlayın"}
        </p>
      </div>
    </div>
  );
}
