import { useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCoachHighlights } from "@/hooks/useSocialMutations";
import { cn } from "@/lib/utils";

interface CategoryComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** When true, shows a "Kategoriden Çıkar" option that returns null */
  allowRemove?: boolean;
  /** Visual: dark/translucent (for over-image dialogs) or default */
  variant?: "default" | "dark";
}

export function CategoryCombobox({
  value,
  onChange,
  disabled,
  placeholder = "Kategori seç veya yeni oluştur…",
  className,
  allowRemove = true,
  variant = "default",
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: highlights = [] } = useCoachHighlights();

  const existingNames = highlights.map((h) => h.category);
  const trimmed = search.trim();
  const exactMatch = existingNames.find(
    (n) => n.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreate = trimmed.length > 0 && !exactMatch;

  const handleSelect = (val: string | null) => {
    onChange(val);
    setSearch("");
    setOpen(false);
  };

  const triggerStyles =
    variant === "dark"
      ? "bg-white/10 border-white/20 text-white hover:bg-white/15 hover:text-white"
      : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", triggerStyles, className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground", variant === "dark" && !value && "text-white/50")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Ara veya yeni isim yaz…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Sonuç yok</CommandEmpty>

            {allowRemove && (
              <CommandGroup>
                <CommandItem onSelect={() => handleSelect(null)} className="text-muted-foreground">
                  <X className="mr-2 h-4 w-4" />
                  Kategoriden Çıkar
                </CommandItem>
              </CommandGroup>
            )}

            {existingNames.length > 0 && (
              <CommandGroup heading="Mevcut Kategoriler">
                {existingNames
                  .filter((n) => n.toLowerCase().includes(trimmed.toLowerCase()))
                  .map((name) => (
                    <CommandItem key={name} onSelect={() => handleSelect(name)}>
                      <Check className={cn("mr-2 h-4 w-4", value === name ? "opacity-100" : "opacity-0")} />
                      {name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {showCreate && (
              <CommandGroup heading="Yeni">
                <CommandItem onSelect={() => handleSelect(trimmed)} className="text-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Oluştur: "{trimmed}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
