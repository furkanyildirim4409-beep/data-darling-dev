import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCoachChat } from "@/hooks/useCoachChat";
import { useAuth } from "@/contexts/AuthContext";
import { CoachInbox } from "@/components/chat/CoachInbox";
import { ActiveChat } from "@/components/chat/ActiveChat";
import { useIsMobile } from "@/hooks/use-mobile";

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
    loadOlderMessages,
  } = useCoachChat();

  const [mobileShowChat, setMobileShowChat] = useState(false);
  const athleteIdParam = searchParams.get('athleteId');

  useEffect(() => {
    if (athleteIdParam && athletes.length > 0 && athleteIdParam !== selectedAthleteId) {
      selectAthlete(athleteIdParam);
      if (isMobile) setMobileShowChat(true);
    }
  }, [athleteIdParam, athletes.length, selectedAthleteId, selectAthlete, isMobile]);

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId) || null;

  const handleSelectAthlete = (id: string) => {
    selectAthlete(id);
    if (isMobile) setMobileShowChat(true);
  };

  const handleBack = () => setMobileShowChat(false);

  if (isMobile) {
    if (mobileShowChat && selectedAthlete) {
      return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <ActiveChat
            athlete={selectedAthlete}
            messages={messages}
            coachId={user?.id || ""}
            isLoading={isLoadingMessages}
            isLoadingOlder={isLoadingOlder}
            hasMoreMessages={hasMoreMessages}
            onSendMessage={sendMessage}
            onLoadOlder={loadOlderMessages}
            onBack={handleBack}
            showBackButton
          />
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-4rem)]">
        <CoachInbox
          athletes={athletes}
          selectedAthleteId={selectedAthleteId}
          onSelectAthlete={handleSelectAthlete}
          isLoading={isLoadingAthletes}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
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
        onSendMessage={sendMessage}
      />
    </div>
  );
}
