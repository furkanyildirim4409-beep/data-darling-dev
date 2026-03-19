import { useState, Fragment, useEffect } from "react";
import { Plus, Mail, Phone, Shield, Check, X, Eye, Edit2, Trash2, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MemberProfileDrawer, TeamMember } from "@/components/team/MemberProfileDrawer";
import { AddMemberDialog } from "@/components/team/AddMemberDialog";
import { TeamChatDialog } from "@/components/team/TeamChatDialog";
import { useTeamPresence } from "@/hooks/useTeamPresence";
import { PresenceIndicator } from "@/components/team/PresenceIndicator";
import { NotificationBadge } from "@/components/team/NotificationBadge";
import { useTeamMembers, useDeleteTeamMember } from "@/hooks/useTeam";

const permissionStyles = {
  full: { label: "Tam Erişim", className: "bg-primary/10 text-primary border-primary/20" },
  limited: { label: "Sınırlı", className: "bg-warning/10 text-warning border-warning/20" },
  "read-only": { label: "Salt Okunur", className: "bg-muted text-muted-foreground border-border" },
};

// Permission Matrix Data
const permissionCategories = [
  {
    category: "Sporcular",
    permissions: [
      { name: "Görüntüleme", full: true, limited: true, readonly: true },
      { name: "Düzenleme", full: true, limited: true, readonly: false },
      { name: "Silme", full: true, limited: false, readonly: false },
    ],
  },
  {
    category: "Programlar",
    permissions: [
      { name: "Görüntüleme", full: true, limited: true, readonly: true },
      { name: "Oluşturma", full: true, limited: true, readonly: false },
      { name: "Atama", full: true, limited: false, readonly: false },
    ],
  },
  {
    category: "Finans",
    permissions: [
      { name: "Görüntüleme", full: true, limited: false, readonly: false },
      { name: "Fatura Oluşturma", full: true, limited: false, readonly: false },
      { name: "Ödeme Alma", full: true, limited: false, readonly: false },
    ],
  },
  {
    category: "Takım",
    permissions: [
      { name: "Görüntüleme", full: true, limited: true, readonly: true },
      { name: "Davet Etme", full: true, limited: false, readonly: false },
      { name: "Yetki Düzenleme", full: true, limited: false, readonly: false },
    ],
  },
];

export default function Team() {
  const { toast } = useToast();
  const { data: teamMembers = [], isLoading } = useTeamMembers();
  const deleteMember = useDeleteTeamMember();
  
  // Dialog states
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatMember, setChatMember] = useState<TeamMember | null>(null);

  // Presence tracking
  const memberIds = teamMembers.map(m => m.id);
  const { 
    presence, 
    unreadCounts, 
    updateMemberName, 
    simulateIncomingMessage,
    clearUnread,
    getMemberPresence 
  } = useTeamPresence(memberIds);

  // Update presence with member names
  useEffect(() => {
    teamMembers.forEach(member => {
      updateMemberName(member.id, member.name);
    });
  }, [teamMembers, updateMemberName]);

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setProfileDrawerOpen(true);
  };

  const handleDeleteMember = (e: React.MouseEvent, memberId: string) => {
    e.stopPropagation();
    deleteMember.mutate(memberId, {
      onSuccess: () => {
        toast({
          title: "Üye Silindi",
          description: "Takım üyesi başarıyla kaldırıldı.",
        });
      },
    });
  };

  const handleOpenChat = (e: React.MouseEvent, member: TeamMember) => {
    e.stopPropagation();
    setChatMember(member);
    setChatDialogOpen(true);
    clearUnread(member.id);
  };

  // Simulate incoming message (for demo - triggered randomly)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7 && teamMembers.length > 0) {
        const randomMember = teamMembers[Math.floor(Math.random() * teamMembers.length)];
        const memberPresence = getMemberPresence(randomMember.id);
        if (memberPresence?.isOnline) {
          simulateIncomingMessage(randomMember.id, randomMember.name);
        }
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [teamMembers, simulateIncomingMessage, getMemberPresence]);

  // Calculate stats
  const fullAccessCount = teamMembers.filter(m => m.permissions === "full").length;
  const limitedAccessCount = teamMembers.filter(m => m.permissions === "limited").length;
  const readOnlyCount = teamMembers.filter(m => m.permissions === "read-only").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Takım</h1>
            <p className="text-muted-foreground mt-1">Personeli ve izinleri yönetin</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-xl p-5 border border-border">
              <div className="flex items-start gap-4">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Takım</h1>
          <p className="text-muted-foreground mt-1">
            Personeli ve izinleri yönetin
          </p>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
          onClick={() => setAddMemberDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Takım Üyesi Ekle
        </Button>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teamMembers.map((member) => {
          const initials = member.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
          const perm = permissionStyles[member.permissions];

          return (
            <div
              key={member.id}
              onClick={() => handleMemberClick(member)}
              className="glass rounded-xl p-5 border border-border group cursor-pointer hover:border-primary/50 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar className="w-14 h-14 border-2 border-primary/30">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Presence indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 bg-card rounded-full p-0.5">
                    <PresenceIndicator 
                      status={getMemberPresence(member.id)?.status || "offline"} 
                      size="md"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <Badge variant="outline" className={cn("text-xs border", perm.className)}>
                      <Shield className="w-3 h-3 mr-1" />
                      {perm.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-primary mb-3">{member.role}</p>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{member.phone}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      <span className="font-mono text-foreground">{member.athletes}</span> sporcu yönetiyor
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-info hover:text-info hover:bg-info/10"
                          onClick={(e) => handleOpenChat(e, member)}
                        >
                          <MessageSquare className="w-3 h-3" />
                        </Button>
                        <NotificationBadge count={unreadCounts[member.id] || 0} />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMemberClick(member);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteMember(e, member.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Matrix */}
      <div className="glass rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Yetki Matrisi</h2>
            <p className="text-sm text-muted-foreground">Rol bazlı erişim kontrolü</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Modül / Eylem</th>
                <th className="text-center py-3 px-4 text-sm font-medium">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Tam Erişim
                  </Badge>
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium">
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    Sınırlı
                  </Badge>
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium">
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                    Salt Okunur
                  </Badge>
                </th>
              </tr>
            </thead>
            <tbody>
              {permissionCategories.map((cat) => (
                <Fragment key={cat.category}>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="py-2 px-4 text-sm font-semibold text-foreground">
                      {cat.category}
                    </td>
                  </tr>
                  {cat.permissions.map((perm) => (
                    <tr key={`${cat.category}-${perm.name}`} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 pl-8 text-sm text-muted-foreground">{perm.name}</td>
                      <td className="py-3 px-4 text-center">
                        {perm.full ? (
                          <Check className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {perm.limited ? (
                          <Check className="w-5 h-5 text-warning mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {perm.readonly ? (
                          <Eye className="w-5 h-5 text-muted-foreground mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl border border-border p-4 text-center">
          <Users className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{teamMembers.length}</p>
          <p className="text-xs text-muted-foreground">Toplam Üye</p>
        </div>
        <div className="glass rounded-xl border border-border p-4 text-center">
          <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{fullAccessCount}</p>
          <p className="text-xs text-muted-foreground">Tam Yetkili</p>
        </div>
        <div className="glass rounded-xl border border-border p-4 text-center">
          <Edit2 className="w-6 h-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{limitedAccessCount}</p>
          <p className="text-xs text-muted-foreground">Sınırlı Erişim</p>
        </div>
        <div className="glass rounded-xl border border-border p-4 text-center">
          <Eye className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{readOnlyCount}</p>
          <p className="text-xs text-muted-foreground">Salt Okunur</p>
        </div>
      </div>

      {/* Dialogs */}
      <MemberProfileDrawer
        open={profileDrawerOpen}
        onOpenChange={setProfileDrawerOpen}
        member={selectedMember}
      />

      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
      />

      {chatMember && (
        <TeamChatDialog
          open={chatDialogOpen}
          onOpenChange={setChatDialogOpen}
          memberName={chatMember.name}
          memberInitials={chatMember.name.split(" ").map(n => n[0]).join("").toUpperCase()}
          memberRole={chatMember.role}
        />
      )}
    </div>
  );
}
