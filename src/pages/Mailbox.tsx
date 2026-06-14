import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Inbox, Send, PenSquare, ArrowLeft, Reply, Forward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUnreadEmails } from "@/hooks/useUnreadEmails";
import { useEmails, type Email } from "@/hooks/useEmails";
import { useIsMobile } from "@/hooks/use-mobile";
import ComposeMailDialog, { type ComposePrefill } from "@/components/mailbox/ComposeMailDialog";

type Folder = "inbound" | "outbound";

const folders = [
  { key: "inbound" as Folder, label: "Gelen Kutusu", icon: Inbox },
  { key: "outbound" as Folder, label: "Gönderilenler", icon: Send },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function withPrefix(prefix: "Re" | "Fwd", subject: string | null) {
  const s = subject || "";
  const re = new RegExp(`^\\s*${prefix}:`, "i");
  return re.test(s) ? s : `${prefix}: ${s || "(Konu yok)"}`;
}

function quoteOriginal(email: Email): string {
  const when = new Date(email.created_at).toLocaleString("tr-TR");
  const meta = `<p>${when} tarihinde <strong>${escapeHtml(email.from_email)}</strong> şunu yazdı:</p>`;
  const body = email.body_html && email.body_html.trim().length > 0
    ? email.body_html
    : `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(email.body_text || "")}</pre>`;
  return (
    `<p><br></p><hr/>` +
    `<p><strong>--- Orijinal Mesaj ---</strong></p>` +
    meta +
    `<blockquote style="border-left:3px solid #ccc;margin:0;padding-left:12px;color:#555">${body}</blockquote>`
  );
}

export default function Mailbox() {
  const [activeTab, setActiveTab] = useState<Folder>("inbound");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composePrefill, setComposePrefill] = useState<ComposePrefill | undefined>(undefined);
  const { unreadCount } = useUnreadEmails();
  const { emails, isLoading, markAsRead } = useEmails(activeTab);
  const isMobile = useIsMobile();

  useEffect(() => {
    setSelectedEmailId(null);
  }, [activeTab]);

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) ?? null;

  const handleSelect = (email: Email) => {
    setSelectedEmailId(email.id);
    if (activeTab === "inbound" && !email.is_read) {
      markAsRead.mutate(email.id);
    }
  };

  const openCompose = (prefill?: ComposePrefill) => {
    setComposePrefill(prefill);
    setComposeOpen(true);
  };

  const handleComposeOpenChange = (next: boolean) => {
    setComposeOpen(next);
    if (!next) setComposePrefill(undefined);
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    const replyTarget = activeTab === "inbound" ? selectedEmail.from_email : selectedEmail.to_email;
    openCompose({
      toEmail: replyTarget,
      subject: withPrefix("Re", selectedEmail.subject),
      bodyHtml: `<p></p>${quoteOriginal(selectedEmail)}`,
    });
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    openCompose({
      toEmail: "",
      subject: withPrefix("Fwd", selectedEmail.subject),
      bodyHtml: `<p></p>${quoteOriginal(selectedEmail)}`,
    });
  };

  const showList = !isMobile || !selectedEmail;
  const showDetail = !isMobile || !!selectedEmail;

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] w-full max-w-[1600px] mx-auto overflow-hidden bg-background">
      {/* Folder sidebar */}
      <div className="w-60 border-r border-border bg-card flex flex-col shrink-0 max-md:hidden">
        <div className="p-3">
          <Button className="w-full gap-2" size="sm" onClick={() => openCompose(undefined)}>
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

      {/* Email list */}
      {showList && (
        <div className="w-full md:min-w-[300px] md:w-1/3 md:max-w-[400px] border-r border-border flex flex-col shrink-0">
          {/* Mobile folder tabs */}
          <div className="md:hidden flex border-b border-border">
            {folders.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveTab(f.key)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors",
                  activeTab === f.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Yükleniyor...</div>
            ) : emails.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Bu klasörde e-posta yok.</div>
            ) : (
              emails.map((email) => {
                const isUnread = activeTab === "inbound" && !email.is_read;
                const isSelected = selectedEmailId === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() => handleSelect(email)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border transition-colors flex gap-3 items-start",
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                      isUnread && "font-semibold"
                    )}
                  >
                    {isUnread && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="text-sm truncate">
                          {activeTab === "inbound" ? email.from_email : email.to_email}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(email.created_at)}
                        </span>
                      </div>
                      <p className="text-sm truncate text-muted-foreground mt-0.5">
                        {email.subject || "(Konu yok)"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>
      )}

      {/* Detail panel */}
      {showDetail && (
        <div className="flex-1 flex flex-col bg-background min-w-0">
          {selectedEmail ? (
            <>
              <div className="p-6 lg:p-8 border-b border-border space-y-3">
                {isMobile && (
                  <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setSelectedEmailId(null)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Geri
                  </Button>
                )}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <h2 className="text-xl lg:text-2xl font-semibold leading-tight min-w-0 flex-1">
                    {selectedEmail.subject || "(Konu yok)"}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleReply}>
                      <Reply className="w-4 h-4" />
                      Yanıtla
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleForward}>
                      <Forward className="w-4 h-4" />
                      İlet
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p><span className="font-medium text-foreground">Kimden:</span> {selectedEmail.from_email}</p>
                  <p><span className="font-medium text-foreground">Kime:</span> {selectedEmail.to_email}</p>
                  <p>{new Date(selectedEmail.created_at).toLocaleString("tr-TR")}</p>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6 lg:p-8 max-w-3xl">
                  {selectedEmail.body_html ? (
                    <div
                      className="max-w-none text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_img]:max-w-full"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(selectedEmail.body_html, {
                          USE_PROFILES: { html: true },
                          FORBID_TAGS: ['style', 'form'],
                          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
                        })
                      }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground">
                      {selectedEmail.body_text || ""}
                    </pre>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Bir e-posta seçin.
              </p>
            </div>
          )}
        </div>
      )}
      <ComposeMailDialog open={composeOpen} onOpenChange={handleComposeOpenChange} prefill={composePrefill} />
    </div>
  );
}
