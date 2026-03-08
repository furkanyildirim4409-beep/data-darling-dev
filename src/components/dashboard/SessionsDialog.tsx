import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Dumbbell, Video, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockSessions = [
  {
    id: 1,
    time: "09:00",
    clientName: "Marcus Thompson",
    type: "PT Birebir",
    typeIcon: User,
    status: "completed",
  },
  {
    id: 2,
    time: "10:30",
    clientName: "Elena Rodriguez",
    type: "Teknik İnceleme",
    typeIcon: Video,
    status: "completed",
  },
  {
    id: 3,
    time: "12:00",
    clientName: "Grup Antrenmanı",
    type: "CrossFit Sınıfı",
    typeIcon: Users,
    status: "in-progress",
  },
  {
    id: 4,
    time: "14:30",
    clientName: "Ahmet Yılmaz",
    type: "PT Birebir",
    typeIcon: Dumbbell,
    status: "upcoming",
  },
  {
    id: 5,
    time: "16:00",
    clientName: "Selin Aksoy",
    type: "Beslenme Danışmanlığı",
    typeIcon: User,
    status: "upcoming",
  },
];

const statusStyles = {
  completed: "bg-success/10 text-success border-success/30",
  "in-progress": "bg-primary/10 text-primary border-primary/30 animate-pulse",
  upcoming: "bg-secondary text-muted-foreground border-border",
};

const statusLabels = {
  completed: "Tamamlandı",
  "in-progress": "Devam Ediyor",
  upcoming: "Yaklaşan",
};

export function SessionsDialog({ open, onOpenChange }: SessionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-foreground">Günlük Seans Programı</span>
              <p className="text-sm font-normal text-muted-foreground">
                Bugünkü tüm randevularınız
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {mockSessions.map((session) => {
            const Icon = session.typeIcon;
            return (
              <div
                key={session.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                  statusStyles[session.status as keyof typeof statusStyles]
                )}
              >
                <div className="text-center min-w-[50px]">
                  <p className="text-lg font-bold font-mono">{session.time}</p>
                </div>
                
                <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <p className="font-medium text-foreground">{session.clientName}</p>
                  <p className="text-sm text-muted-foreground">{session.type}</p>
                </div>

                <Badge variant="outline" className="text-xs">
                  {statusLabels[session.status as keyof typeof statusLabels]}
                </Badge>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam <span className="font-mono text-primary">{mockSessions.length}</span> seans
          </p>
          <p className="text-sm text-muted-foreground">
            Tamamlanan: <span className="font-mono text-success">{mockSessions.filter(s => s.status === "completed").length}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
