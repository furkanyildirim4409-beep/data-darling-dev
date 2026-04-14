import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Mail, Send, Inbox, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEmails } from "@/hooks/useEmails";
import { useIsMobile } from "@/hooks/use-mobile";
import { ComposeMailDialog } from "@/components/mailbox/ComposeMailDialog";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

type TabType = "inbound" | "outbound";

export default function Mailbox() {
  const [activeTab, setActiveTab] = useState<TabType>("inbound");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const isMobile = useIsMobile();

  const { emails, isLoading, markAsRead } = useEmails(activeTab);

  const selectedEmail = emails?.find((e) => e.id === selectedEmailId) ?? null;

  useEffect(() => {
    setSelectedEmailId(null);
  }, [activeTab]);

  const handleSelectEmail = (email: any) => {
    setSelectedEmailId(email.id);
    if (activeTab === "inbound" && !email.is_read) {
      markAsRead.mutate(email.id);
    }
  };

  const folders = [
    { key: "inbound" as TabType, label: "Gelen Kutusu", icon: Inbox },
    { key: "outbound" as TabType, label: "Gönderilenler", icon: Send },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Sidebar - Folders */}
      <div className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Button onClick={() => setComposeOpen(true)} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Yeni Mail
          </Button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {folders.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveTab(f.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === f.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <f.icon className="w-4 h-4" />
              {f.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Content Area - Master/Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Email List */}
        {(!isMobile || !selectedEmail) && (
          <div className={cn("border-r border-border flex flex-col", isMobile ? "flex-1" : "w-[350px] shrink-0")}>
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-sm text-foreground">
                {activeTab === "inbound" ? "Gelen Kutusu" : "Gönderilenler"}
              </h2>
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Yükleniyor...</div>
              ) : !emails?.length ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Henüz e-posta yok.
                </div>
              ) : (
                emails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border transition-colors",
                      selectedEmailId === email.id
                        ? "bg-primary/5"
                        : "hover:bg-muted/50",
                      !email.is_read && activeTab === "inbound" && "bg-primary/[0.03]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {!email.is_read && activeTab === "inbound" && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                      <span className={cn("text-sm truncate flex-1", !email.is_read && activeTab === "inbound" ? "font-semibold text-foreground" : "text-foreground")}>
                        {activeTab === "inbound" ? email.from_email : email.to_email}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(email.created_at), { addSuffix: true, locale: tr })}
                      </span>
                    </div>
                    <p className={cn("text-sm truncate mt-0.5", !email.is_read && activeTab === "inbound" ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {email.subject || "(Konu yok)"}
                    </p>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>
        )}

        {/* Detail Panel */}
        {(!isMobile || selectedEmail) && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedEmail ? (
              <>
                {isMobile && (
                  <div className="px-4 py-2 border-b border-border">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmailId(null)} className="gap-1">
                      <ArrowLeft className="w-4 h-4" /> Geri Dön
                    </Button>
                  </div>
                )}
                <div className="px-6 py-4 border-b border-border space-y-1">
                  <h1 className="text-lg font-semibold text-foreground">{selectedEmail.subject || "(Konu yok)"}</h1>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{selectedEmail.from_email}</span>
                    {" → "}
                    <span>{selectedEmail.to_email}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(selectedEmail.created_at).toLocaleString("tr-TR")}
                  </div>
                </div>
                <ScrollArea className="flex-1 p-6">
                  {selectedEmail.body_html ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                      {selectedEmail.body_text || ""}
                    </pre>
                  )}
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  Bir e-posta seçin.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ComposeMailDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}
