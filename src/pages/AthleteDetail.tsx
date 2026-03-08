import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, Calendar, Edit, MoreHorizontal, User, Dumbbell, Apple } from "lucide-react";
import { mockAthletes } from "@/data/athletes";
import { EnergyBank } from "@/components/athlete-detail/EnergyBank";
import { SmartContract } from "@/components/athlete-detail/SmartContract";
import { BodyModel3D } from "@/components/athlete-detail/BodyModel3D";
import { WellnessRadar } from "@/components/athlete-detail/WellnessRadar";
import { BloodworkPanel } from "@/components/athlete-detail/BloodworkPanel";
import { MetabolicFlux } from "@/components/athlete-detail/MetabolicFlux";
import { TimelineAI } from "@/components/athlete-detail/TimelineAI";
import { ActiveBlocks } from "@/components/athlete-detail/ActiveBlocks";
import { ChatWidget } from "@/components/athlete-detail/ChatWidget";
import { ProgramTab } from "@/components/athlete-detail/ProgramTab";
import { NutritionTab } from "@/components/athlete-detail/NutritionTab";
import { cn } from "@/lib/utils";

export default function AthleteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");

  const athlete = mockAthletes.find((a) => a.id === id) || mockAthletes[0];
  const initials = athlete.name.split(" ").map((n) => n[0]).join("").toUpperCase();
  const age = 28;
  const height = "180cm";
  const energyLevel = athlete.readiness;
  const missedWorkouts = athlete.checkInStatus === "missed" ? 3 : 1;
  const totalWorkouts = 12;
  const isVaultSecure = missedWorkouts <= 2;

  const wellnessData = {
    sleep: athlete.latestCheckIn?.sleep || 7,
    stress: athlete.latestCheckIn?.stress || 4,
    digestion: 8,
    mood: athlete.latestCheckIn?.mood || 7,
    soreness: athlete.latestCheckIn?.soreness || 3,
  };

  const startStats = { bodyFat: 22, muscleMass: 70, strength: 65, endurance: 55 };
  const currentStats = { bodyFat: 18, muscleMass: 75, strength: 82, endurance: 70 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/athletes")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />Kadroya Dön
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-border hover:bg-secondary"><Edit className="w-4 h-4 mr-2" />Profili Düzenle</Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreHorizontal className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="glass rounded-xl border border-border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20 border-2 border-primary/30">
              <AvatarImage src={athlete.avatar} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{athlete.name}</h1>
                <Badge variant="outline" className={cn("text-sm", athlete.tier === "Elite" ? "bg-primary/10 text-primary border-primary/20" : athlete.tier === "Pro" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-muted text-muted-foreground border-border")}>{athlete.tier}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{athlete.sport}</span><span>•</span><span>{age} yaşında</span><span>•</span><span>{height}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"><Mail className="w-4 h-4" /><span>{athlete.email}</span></div>
                <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"><Phone className="w-4 h-4" /><span>{athlete.phone}</span></div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="w-4 h-4" /><span>Üyelik: {new Date(athlete.joinDate).toLocaleDateString('tr-TR')}</span></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <EnergyBank percentage={energyLevel} />
            <SmartContract isSecure={isVaultSecure} missedWorkouts={missedWorkouts} totalWorkouts={totalWorkouts} />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass border border-border w-full justify-start gap-2 p-1 h-auto">
          <TabsTrigger value="general" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><User className="w-4 h-4" />Genel</TabsTrigger>
          <TabsTrigger value="program" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Dumbbell className="w-4 h-4" />Antrenman Programı</TabsTrigger>
          <TabsTrigger value="nutrition" className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-success data-[state=active]:text-success-foreground"><Apple className="w-4 h-4" />Beslenme Planı</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground"><span className="w-2 h-2 rounded-full bg-primary" />Biyo-Veri</div>
              <BodyModel3D /><WellnessRadar data={wellnessData} /><BloodworkPanel />
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground"><span className="w-2 h-2 rounded-full bg-warning" />Performans</div>
              <MetabolicFlux /><TimelineAI currentStats={currentStats} startStats={startStats} />
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground"><span className="w-2 h-2 rounded-full bg-success" />Yönetim</div>
              <ActiveBlocks trainingBlock={{ name: athlete.currentProgram, week: 4, totalWeeks: 8, phase: "Hipertrofi Fazı" }} dietBlock={{ name: athlete.currentDiet, calories: athlete.currentCalories, protein: athlete.currentProtein, type: "Kütle Kazanım Fazı" }} />
              <ChatWidget athleteName={athlete.name} athleteInitials={initials} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="program" className="mt-6">
          <ProgramTab athleteId={athlete.id} currentProgram={athlete.currentProgram} />
        </TabsContent>

        <TabsContent value="nutrition" className="mt-6">
          <NutritionTab athleteId={athlete.id} currentDiet={athlete.currentDiet} calories={athlete.currentCalories} protein={athlete.currentProtein} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
