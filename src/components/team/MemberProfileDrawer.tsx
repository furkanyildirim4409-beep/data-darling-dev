import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Phone,
  Shield,
  User,
  History,
  Save,
  Edit2,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Settings,
  UserPlus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUpdateTeamMember } from "@/hooks/useTeam";
import { useAuth } from "@/contexts/AuthContext";
import { useAthletes } from "@/hooks/useAthletes";
import {
  useTeamMemberAssignments,
  useUpdateTeamMemberAssignments,
} from "@/hooks/useTeamAssignments";

export interface TeamMember {
  id: string;
  userId?: string | null;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  permissions: "full" | "limited" | "read-only";
  athletes: number;
  startDate?: string;
}

interface MemberProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
}

const permissionStyles = {
  full: { label: "Tam Erişim", className: "bg-primary/10 text-primary border-primary/20" },
  limited: { label: "Sınırlı", className: "bg-warning/10 text-warning border-warning/20" },
  "read-only": { label: "Salt Okunur", className: "bg-muted text-muted-foreground border-border" },
};

const generateAuditLogs = (_memberName: string) => [
  { id: 1, action: "Ahmet Yılmaz'ın programını güncelledi", time: "2 saat önce", type: "program" },
  { id: 2, action: "Zeynep Kaya için beslenme planı oluşturdu", time: "5 saat önce", type: "nutrition" },
  { id: 3, action: "Sistem ayarlarını değiştirdi", time: "1 gün önce", type: "settings" },
  { id: 4, action: "Mehmet Demir'in performans raporunu inceledi", time: "1 gün önce", type: "report" },
  { id: 5, action: "Yeni sporcu ekledi: Elif Öztürk", time: "2 gün önce", type: "athlete" },
  { id: 6, action: "Takım toplantısı planladı", time: "3 gün önce", type: "calendar" },
  { id: 7, action: "Fatura #INV-003 oluşturdu", time: "4 gün önce", type: "invoice" },
  { id: 8, action: "Can Arslan'ın antrenman bloğunu düzenledi", time: "5 gün önce", type: "program" },
  { id: 9, action: "Grup antrenmanı seansı planladı", time: "6 gün önce", type: "calendar" },
  { id: 10, action: "Sistem güncellemelerini kontrol etti", time: "1 hafta önce", type: "settings" },
];

const getActionIcon = (type: string) => {
  switch (type) {
    case "program": return <FileText className="w-4 h-4 text-primary" />;
    case "nutrition": return <FileText className="w-4 h-4 text-success" />;
    case "settings": return <Settings className="w-4 h-4 text-muted-foreground" />;
    case "report": return <FileText className="w-4 h-4 text-info" />;
    case "athlete": return <Users className="w-4 h-4 text-primary" />;
    case "calendar": return <Calendar className="w-4 h-4 text-warning" />;
    case "invoice": return <DollarSign className="w-4 h-4 text-success" />;
    default: return <History className="w-4 h-4 text-muted-foreground" />;
  }
};

const permissionItems = [
  { id: "view_athletes", label: "Sporcuları Görüntüle", category: "Sporcular" },
  { id: "edit_athletes", label: "Sporcu Düzenle", category: "Sporcular" },
  { id: "delete_athletes", label: "Sporcu Sil", category: "Sporcular" },
  { id: "view_programs", label: "Programları Görüntüle", category: "Programlar" },
  { id: "create_programs", label: "Program Oluştur", category: "Programlar" },
  { id: "assign_programs", label: "Program Ata", category: "Programlar" },
  { id: "view_finance", label: "Finansı Görüntüle", category: "Finans" },
  { id: "create_invoices", label: "Fatura Oluştur", category: "Finans" },
  { id: "receive_payments", label: "Ödeme Al", category: "Finans" },
  { id: "view_team", label: "Takımı Görüntüle", category: "Takım" },
  { id: "invite_members", label: "Üye Davet Et", category: "Takım" },
  { id: "edit_permissions", label: "Yetki Düzenle", category: "Takım" },
];

const getDefaultPermissions = (level: string): Record<string, boolean> => {
  const base: Record<string, boolean> = {};
  permissionItems.forEach(item => {
    if (level === "full") {
      base[item.id] = true;
    } else if (level === "limited") {
      base[item.id] = ["view_athletes", "edit_athletes", "view_programs", "create_programs", "view_team"].includes(item.id);
    } else {
      base[item.id] = item.id.startsWith("view_");
    }
  });
  return base;
};

export function MemberProfileDrawer({ 
  open, 
  onOpenChange, 
  member,
}: MemberProfileDrawerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const updateMember = useUpdateTeamMember();
  const [editMode, setEditMode] = useState(false);
  const [editedMember, setEditedMember] = useState<TeamMember | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  // Assignment state
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { athletes } = useAthletes();
  const { data: assignedIds } = useTeamMemberAssignments(member?.id || "");
  const updateAssignments = useUpdateTeamMemberAssignments();

  // Sync fetched assignments into local state
  useEffect(() => {
    if (assignedIds && open) {
      setSelectedAthleteIds(assignedIds);
    }
  }, [assignedIds, open]);

  // Reset state when member changes
  useEffect(() => {
    if (member && open) {
      setEditedMember({ ...member });
      setPermissions(getDefaultPermissions(member.permissions));
      setEditMode(false);
      setSearchQuery("");
    }
  }, [member, open]);

  if (!member) return null;

  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const perm = permissionStyles[member.permissions];
  const auditLogs = generateAuditLogs(member.name);

  const handleSave = async () => {
    if (!editedMember) return;
    try {
      await updateMember.mutateAsync({
        id: editedMember.id,
        full_name: editedMember.name,
        email: editedMember.email,
        role: editedMember.role,
        permissions: editedMember.permissions,
        phone: editedMember.phone,
      });
      toast({
        title: "Profil Güncellendi",
        description: `${editedMember.name} bilgileri kaydedildi. ✅`,
      });
      setEditMode(false);
      onOpenChange(false);
    } catch {
      toast({
        title: "Hata",
        description: "Profil güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAssignments = async () => {
    if (!user) return;
    try {
      await updateAssignments.mutateAsync({
        teamMemberId: member.id,
        headCoachId: user.id,
        athleteIds: selectedAthleteIds,
      });
      toast({
        title: "Atamalar Güncellendi",
        description: "Öğrenci atamaları başarıyla güncellendi. ✅",
      });
    } catch {
      toast({
        title: "Hata",
        description: "Atamalar güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthleteIds((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const filteredAthletes = athletes.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePermission = (id: string) => {
    setPermissions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const groupedPermissions = permissionItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof permissionItems>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[540px] bg-card border-border overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/30">
              <AvatarImage src={member.avatar} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">{member.name}</SheetTitle>
              <SheetDescription className="text-primary">{member.role}</SheetDescription>
              <Badge variant="outline" className={cn("text-xs border mt-2", perm.className)}>
                <Shield className="w-3 h-3 mr-1" />
                {perm.label}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full bg-muted/50 mt-4">
            <TabsTrigger value="general" className="flex-1">
              <User className="w-4 h-4 mr-1.5" />
              Genel
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex-1">
              <UserPlus className="w-4 h-4 mr-1.5" />
              Atamalar
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex-1">
              <Shield className="w-4 h-4 mr-1.5" />
              Yetkiler
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex-1">
              <History className="w-4 h-4 mr-1.5" />
              Geçmiş
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="flex-1 overflow-auto mt-4 space-y-4">
            <div className="flex justify-end">
              {editMode ? (
                <Button size="sm" onClick={handleSave} disabled={updateMember.isPending}>
                  <Save className="w-4 h-4 mr-1.5" />
                  {updateMember.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => {
                  setEditedMember({ ...member });
                  setEditMode(true);
                }}>
                  <Edit2 className="w-4 h-4 mr-1.5" />
                  Düzenle
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  value={editMode ? editedMember?.name : member.name}
                  onChange={(e) => setEditedMember(prev => prev ? { ...prev, name: e.target.value } : null)}
                  disabled={!editMode}
                  className="bg-background/50"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">E-posta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={editMode ? editedMember?.email : member.email}
                    onChange={(e) => setEditedMember(prev => prev ? { ...prev, email: e.target.value } : null)}
                    disabled={!editMode}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Telefon</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={editMode ? editedMember?.phone : member.phone}
                    onChange={(e) => setEditedMember(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    disabled={!editMode}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <Select 
                  value={editMode ? editedMember?.role : member.role}
                  onValueChange={(value) => setEditedMember(prev => prev ? { ...prev, role: value } : null)}
                  disabled={!editMode}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="Baş Antrenör">Baş Antrenör</SelectItem>
                    <SelectItem value="Yardımcı Antrenör">Yardımcı Antrenör</SelectItem>
                    <SelectItem value="Diyetisyen">Diyetisyen</SelectItem>
                    <SelectItem value="Fizyoterapist">Fizyoterapist</SelectItem>
                    <SelectItem value="Sporcu Koordinatörü">Sporcu Koordinatörü</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="permissions">Yetki Seviyesi</Label>
                <Select 
                  value={editMode ? editedMember?.permissions : member.permissions}
                  onValueChange={(value: "full" | "limited" | "read-only") => {
                    setEditedMember(prev => prev ? { ...prev, permissions: value } : null);
                    setPermissions(getDefaultPermissions(value));
                  }}
                  disabled={!editMode}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="full">Tam Erişim</SelectItem>
                    <SelectItem value="limited">Sınırlı</SelectItem>
                    <SelectItem value="read-only">Salt Okunur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">İstatistikler</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-lg p-3 border border-border text-center">
                  <p className="text-2xl font-bold text-foreground">{member.athletes}</p>
                  <p className="text-xs text-muted-foreground">Sporcu Yönetiyor</p>
                </div>
                <div className="glass rounded-lg p-3 border border-border text-center">
                  <p className="text-2xl font-bold text-foreground">156</p>
                  <p className="text-xs text-muted-foreground">İşlem Kaydı</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="flex-1 overflow-hidden mt-4 flex flex-col">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Sporcu ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {selectedAthleteIds.length} / {athletes.length} sporcu atandı
              </p>
            </div>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-2">
                {filteredAthletes.map((athlete) => {
                  const isSelected = selectedAthleteIds.includes(athlete.id);
                  const athleteInitials = athlete.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <label
                      key={athlete.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        isSelected
                          ? "bg-primary/5 border-primary/30"
                          : "bg-background/50 border-border hover:border-primary/20"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAthleteSelection(athlete.id)}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={athlete.avatar} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {athleteInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{athlete.name}</span>
                    </label>
                  );
                })}

                {filteredAthletes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {searchQuery ? "Sporcu bulunamadı." : "Henüz sporcu yok."}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="pt-3 border-t border-border mt-3">
              <Button
                className="w-full"
                onClick={handleSaveAssignments}
                disabled={updateAssignments.isPending}
              >
                <Save className="w-4 h-4 mr-1.5" />
                {updateAssignments.isPending ? "Kaydediliyor..." : "Atamaları Kaydet"}
              </Button>
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-foreground mb-3">{category}</h3>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                        >
                          <Label htmlFor={item.id} className="text-sm cursor-pointer">
                            {item.label}
                          </Label>
                          <Switch
                            id={item.id}
                            checked={permissions[item.id] || false}
                            onCheckedChange={() => togglePermission(item.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getActionIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{log.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
