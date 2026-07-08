import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, HeartPulse, Pill, ShieldCheck, FileText, CalendarClock, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface IntakeFormTabProps {
  athleteId: string;
}

interface IntakeRow {
  email: string;
  phone: string;
  medical_conditions: string | null;
  medications: string | null;
  created_at: string;
  agreement_accepted: boolean;
  kvkk_accepted: boolean;
}

export function IntakeFormTab({ athleteId }: IntakeFormTabProps) {
  const { user, activeCoachId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [intake, setIntake] = useState<IntakeRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const coachId = activeCoachId ?? user?.id;
    if (!coachId || !athleteId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("athlete_intake_forms")
        .select("email, phone, medical_conditions, medications, created_at, agreement_accepted, kvkk_accepted")
        .eq("athlete_id", athleteId)
        .eq("coach_id", coachId) // client-side RLS enforcement
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (err) {
        setError(err.message);
      } else {
        setIntake((data as IntakeRow | null) ?? null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [athleteId, activeCoachId, user?.id]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="glass border-destructive/40">
        <CardContent className="py-8 text-center text-sm text-destructive">
          Form yüklenemedi: {error}
        </CardContent>
      </Card>
    );
  }

  if (!intake) {
    return (
      <Card className="glass border-border">
        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground" />
          <div className="text-sm text-muted-foreground max-w-md">
            Bu sporcu satın alma öncesi Sağlık &amp; İletişim formunu doldurmamış.
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = new Date(intake.created_at).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Contact Card */}
        <Card className="glass border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4 text-primary" />
              İletişim Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">E-posta</div>
                <a
                  href={`mailto:${intake.email}`}
                  className="text-sm font-medium text-foreground break-all hover:text-primary"
                >
                  {intake.email}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Telefon</div>
                <a
                  href={`tel:${intake.phone}`}
                  className="text-sm font-medium text-foreground hover:text-primary"
                >
                  {intake.phone}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Card */}
        <Card className="glass border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="w-4 h-4 text-destructive" />
              Sağlık Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <HeartPulse className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Hastalıklar (Medical Conditions)
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {intake.medical_conditions?.trim() || (
                    <span className="italic text-muted-foreground">Belirtilmemiş</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Pill className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Kullanılan İlaçlar (Medications)
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {intake.medications?.trim() || (
                    <span className="italic text-muted-foreground">Belirtilmemiş</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="gap-1 border-border">
          <CalendarClock className="w-3 h-3" />
          Gönderim: {formattedDate}
        </Badge>
        {intake.kvkk_accepted && (
          <Badge variant="outline" className="gap-1 border-success/40 text-success bg-success/10">
            <ShieldCheck className="w-3 h-3" />
            KVKK Onayı
          </Badge>
        )}
        {intake.agreement_accepted && (
          <Badge variant="outline" className="gap-1 border-primary/40 text-primary bg-primary/10">
            <FileText className="w-3 h-3" />
            Sözleşme Onayı
          </Badge>
        )}
      </div>
    </div>
  );
}
