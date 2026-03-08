import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, FileText, Layout, X, Users, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearch, SearchResult } from "@/contexts/SearchContext";
import { cn } from "@/lib/utils";

const typeIcons: Record<SearchResult["type"], typeof User> = {
  Sporcu: User,
  Program: FileText,
  Sayfa: Layout,
  "Takım Üyesi": Users,
  Fatura: Receipt,
};

const typeStyles: Record<SearchResult["type"], string> = {
  Sporcu: "bg-primary/10 text-primary",
  Program: "bg-success/10 text-success",
  Sayfa: "bg-warning/10 text-warning",
  "Takım Üyesi": "bg-info/10 text-info",
  Fatura: "bg-destructive/10 text-destructive",
};

export function GlobalSearch() {
  const { query, setQuery, results, isOpen, setIsOpen } = useSearch();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen, setQuery]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  const handleResultClick = (path: string) => {
    navigate(path);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full md:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder="Ara..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="pl-10 pr-10 md:pr-16 bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 h-9 md:h-10"
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            setIsOpen(false);
          }}
          className="absolute right-3 md:right-12 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:block">
        <kbd className="px-2 py-0.5 text-xs font-mono bg-muted text-muted-foreground rounded border border-border">
          ⌘K
        </kbd>
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
          {results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map((result) => {
                const Icon = typeIcons[result.type];
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result.path)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", typeStyles[result.type])}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{result.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{result.type}</span>
                        {result.subtext && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{result.subtext}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm">"{query}" için sonuç bulunamadı</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
