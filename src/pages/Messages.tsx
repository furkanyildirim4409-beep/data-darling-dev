import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useAuth } from "@/contexts/AuthContext";
import { CoachInbox } from "@/components/chat/CoachInbox";
import { ActiveChat } from "@/components/chat/ActiveChat";
import { TeamChatInterface } from "@/components/messages/TeamChatInterface";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users } from "lucide-react";

export default function Messages() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const {
    athletes,
    selectedAthleteId,
    messages,
    isLoadingAthletes,
    isLoadingMessages,
    isLoadingOlder,
    hasMoreMessages,
    selectAthlete,
    sendMessage,
    unsendMessage,
    loadOlderMessages,
    respondToRequest,
    clearSelection,
  } = useCoachChat();

  useEffect(() => {
    return () => {
      clearSelection();
    };
  }, [clearSelection]);


  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState("athletes");
  const athleteIdParam = searchParams.get('athleteId');

  useEffect(() => {
    if (athleteIdParam && athletes.length > 0 && athleteIdParam !== selectedAthleteId) {
      selectAthlete(athleteIdParam);
      setActiveTab("athletes");
      if (isMobile) setMobileShowChat(true);
    }
  }, [athleteIdParam, athletes.length, selectedAthleteId, selectAthlete, isMobile]);

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId) || null;

  const handleSelectAthlete = (id: string) => {
    selectAthlete(id);
    if (isMobile) setMobileShowChat(true);
  };

  const handleBack = () => setMobileShowChat(false);

  // --- Athlete chat content (reused across mobile/desktop) ---
  const athleteChatMobileView = () => {
    if (mobileShowChat && selectedAthlete) {
      return (
        <div className="h-full flex flex-col">
          <ActiveChat
            athlete={selectedAthlete}
            messages={messages}
            coachId={user?.id || ""}
            isLoading={isLoadingMessages}
            isLoadingOlder={isLoadingOlder}
            hasMoreMessages={hasMoreMessages}
            onSendMessage={sendMessage}
            onUnsendMessage={unsendMessage}
            onLoadOlder={loadOlderMessages}

            onBack={handleBack}
            showBackButton
            onRespondToRequest={respondToRequest}
          />
        </div>
      );
    }
    return (
      <div className="h-full">
        <CoachInbox
          athletes={athletes}
          selectedAthleteId={selectedAthleteId}
          onSelectAthlete={handleSelectAthlete}
          isLoading={isLoadingAthletes}
        />
      </div>
    );
  };

  const athleteChatDesktopView = (
    <div className="flex h-full overflow-hidden">
      <div className="w-80 flex-shrink-0">
        <CoachInbox
          athletes={athletes}
          selectedAthleteId={selectedAthleteId}
          onSelectAthlete={handleSelectAthlete}
          isLoading={isLoadingAthletes}
        />
      </div>
      <ActiveChat
        athlete={selectedAthlete}
        messages={messages}
        coachId={user?.id || ""}
        isLoading={isLoadingMessages}
        isLoadingOlder={isLoadingOlder}
        hasMoreMessages={hasMoreMessages}
        onSendMessage={sendMessage}
        onUnsendMessage={unsendMessage}
        onLoadOlder={loadOlderMessages}

        onRespondToRequest={respondToRequest}
      />
    </div>
  );

  const directUnread = athletes.reduce((s, a) => s + (a.unreadCount || 0), 0);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col overflow-hidden">
      <div className="px-4 pt-2 border-b border-border bg-card flex-shrink-0">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="athletes" className="gap-1.5 data-[state=active]:bg-background">
            <MessageCircle className="w-4 h-4" />
            Sporcular
            {directUnread > 0 && (
              <Badge className="ml-2 bg-red-500 hover:bg-red-500 text-white rounded-full h-5 min-w-5 flex items-center justify-center p-0 text-[10px] font-bold border-0">
                {directUnread > 9 ? "9+" : directUnread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 data-[state=active]:bg-background">
            <Users className="w-4 h-4" />
            Ekip İçi
          </TabsTrigger>
        </TabsList>
      </div>


      <TabsContent value="athletes" className="flex-1 overflow-hidden m-0 p-0">
        {isMobile ? athleteChatMobileView() : athleteChatDesktopView}
      </TabsContent>

      <TabsContent value="team" className="flex-1 overflow-hidden m-0 p-0">
        <TeamChatInterface />
      </TabsContent>
    </Tabs>
  );
}
