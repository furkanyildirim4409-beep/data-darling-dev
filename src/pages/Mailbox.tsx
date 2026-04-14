import { useState } from "react";
import { Inbox, Send, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUnreadEmails } from "@/hooks/useUnreadEmails";

type Folder = "inbound" | "outbound";

const folders = [
  { key: "inbound" as Folder, label: "Gelen Kutusu", icon: Inbox },
  { key: "outbound" as Folder, label: "Gönderilenler", icon: Send },
];

export default function Mailbox() {
  const [activeTab, setActiveTab] = useState<Folder>("inbound");
  const { unreadCount } = useUnreadEmails();

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left sidebar */}
      <div className="w-60 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-3">
          <Button className="w-full gap-2" size="sm">
            <PenSquare className="w-4 h-4" />
            Yeni Mail
          </Button>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {folders.map((folder) => {
            const isActive = activeTab === folder.key;
            const Icon = folder.icon;
            return (
              <button
                key={folder.key}
                onClick={() => setActiveTab(folder.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{folder.label}</span>
                {folder.key === "inbound" && unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center bg-primary text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right content area */}
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">
          Bir klasör seçin veya e-posta görüntüleyin.
        </p>
      </div>
    </div>
  );
}
