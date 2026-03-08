import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { mockAthletes } from "@/data/athletes";

// Mock programs data
const mockPrograms = [
  { id: "prog-1", name: "Hipertrofi A", type: "Antrenman" },
  { id: "prog-2", name: "Güç Döngüsü B", type: "Antrenman" },
  { id: "prog-3", name: "Yağ Yakım Programı", type: "Antrenman" },
  { id: "prog-4", name: "Kesim Diyeti", type: "Beslenme" },
  { id: "prog-5", name: "Bulk Programı", type: "Beslenme" },
  { id: "prog-6", name: "Performans Diyeti", type: "Beslenme" },
];

// Team members data
const mockTeamMembers = [
  { id: "team-1", name: "Koç Davis", role: "Baş Antrenör" },
  { id: "team-2", name: "Mike Reynolds", role: "Yardımcı Antrenör" },
  { id: "team-3", name: "Lisa Park", role: "Diyetisyen" },
  { id: "team-4", name: "Carlos Mendez", role: "Fizyoterapist" },
];

// Invoices data
const mockInvoices = [
  { id: "inv-1", name: "Marcus Chen - Aylık Koçluk", amount: "3.500 ₺", status: "Ödendi" },
  { id: "inv-2", name: "Elena Rodriguez - Premium Paket", amount: "5.000 ₺", status: "Bekliyor" },
  { id: "inv-3", name: "Jake Thompson - Başlangıç", amount: "1.500 ₺", status: "Gecikmiş" },
  { id: "inv-4", name: "Mehmet Demir - E-Kitap", amount: "199 ₺", status: "Ödendi" },
];

// Pages for navigation
const mockPages = [
  { id: "page-1", name: "Kokpit", path: "/" },
  { id: "page-2", name: "Sporcular", path: "/athletes" },
  { id: "page-3", name: "Program Mimarı", path: "/programs" },
  { id: "page-4", name: "Hızlı Müdahale", path: "/alerts" },
  { id: "page-5", name: "İş Yönetimi", path: "/business" },
  { id: "page-6", name: "Mağaza", path: "/store" },
  { id: "page-7", name: "İçerik Stüdyosu", path: "/content" },
  { id: "page-8", name: "Takım", path: "/team" },
  { id: "page-9", name: "Ayarlar", path: "/settings" },
  { id: "page-10", name: "Performans Analizi", path: "/performance" },
];

export interface SearchResult {
  id: string;
  name: string;
  type: "Sporcu" | "Program" | "Sayfa" | "Takım Üyesi" | "Fatura";
  path: string;
  subtext?: string;
}

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    const foundResults: SearchResult[] = [];

    // Search athletes
    mockAthletes.forEach((athlete) => {
      if (athlete.name.toLowerCase().includes(searchTerm)) {
        foundResults.push({
          id: athlete.id,
          name: athlete.name,
          type: "Sporcu",
          path: `/athletes/${athlete.id}`,
          subtext: athlete.sport,
        });
      }
    });

    // Search programs
    mockPrograms.forEach((program) => {
      if (program.name.toLowerCase().includes(searchTerm)) {
        foundResults.push({
          id: program.id,
          name: program.name,
          type: "Program",
          path: "/programs",
          subtext: program.type,
        });
      }
    });

    // Search team members
    mockTeamMembers.forEach((member) => {
      if (
        member.name.toLowerCase().includes(searchTerm) ||
        member.role.toLowerCase().includes(searchTerm)
      ) {
        foundResults.push({
          id: member.id,
          name: member.name,
          type: "Takım Üyesi",
          path: "/team",
          subtext: member.role,
        });
      }
    });

    // Search invoices
    mockInvoices.forEach((invoice) => {
      if (
        invoice.name.toLowerCase().includes(searchTerm) ||
        invoice.status.toLowerCase().includes(searchTerm)
      ) {
        foundResults.push({
          id: invoice.id,
          name: invoice.name,
          type: "Fatura",
          path: "/business",
          subtext: `${invoice.amount} - ${invoice.status}`,
        });
      }
    });

    // Search pages
    mockPages.forEach((page) => {
      if (page.name.toLowerCase().includes(searchTerm)) {
        foundResults.push({
          id: page.id,
          name: page.name,
          type: "Sayfa",
          path: page.path,
        });
      }
    });

    return foundResults.slice(0, 10); // Limit to 10 results
  }, [query]);

  return (
    <SearchContext.Provider value={{ query, setQuery, results, isOpen, setIsOpen }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}