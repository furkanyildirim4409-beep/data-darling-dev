import { HighlightsSection } from "@/components/content-studio/HighlightsSection";
import { FeedPlanner } from "@/components/content-studio/FeedPlanner";
import { ProfileSettings } from "@/components/content-studio/ProfileSettings";
import { MobileProfilePreview } from "@/components/content-studio/MobileProfilePreview";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { usePermissions } from "@/hooks/usePermissions";

export default function ContentStudio() {
  const { canManageContent } = usePermissions();

  return (
    <ProfileProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            İçerik Stüdyosu
          </h1>
          <p className="text-muted-foreground mt-1">
            Profil içeriklerinizi yönetin, paylaşımlarınızı planlayın
          </p>
        </div>

        {/* Highlights Section */}
        <HighlightsSection canManage={canManageContent} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed Planner - 2 columns */}
          <div className="lg:col-span-2">
            <FeedPlanner canManage={canManageContent} />
          </div>

          {/* Profile Settings & Preview - 1 column */}
          <div className="lg:col-span-1 space-y-6">
            <ProfileSettings canManage={canManageContent} />
            <MobileProfilePreview />
          </div>
        </div>
      </div>
    </ProfileProvider>
  );
}
