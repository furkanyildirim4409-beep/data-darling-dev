import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User, Settings, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "./GlobalSearch";
import { MobileNav } from "./MobileNav";
import { CoachNotificationBell } from "./CoachNotificationBell";
import { useIsMobile } from "@/hooks/use-mobile";

export function TopBar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { profile, signOut } = useAuth();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="h-14 md:h-16 glass border-b border-border flex items-center justify-between px-3 md:px-6">
      {/* Left Section - Mobile Nav + Logo or Search */}
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        <MobileNav />

        {isMobile && !mobileSearchOpen && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">D</span>
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">DYNABOLIC</span>
          </div>
        )}

        {isMobile && !mobileSearchOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSearchOpen(true)}
            className="ml-auto"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}

        {isMobile && mobileSearchOpen && (
          <div className="flex-1 flex items-center gap-2">
            <GlobalSearch />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileSearchOpen(false)}
              className="text-muted-foreground"
            >
              İptal
            </Button>
          </div>
        )}

        {!isMobile && <GlobalSearch />}
      </div>

      {/* Right Section */}
      {!(isMobile && mobileSearchOpen) && (
        <div className="flex items-center gap-2 md:gap-4">
          {/* Master Notification Center (aggregated) */}
          <CoachNotificationBell />

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 hover:bg-secondary px-2"
              >
                <Avatar className="w-8 h-8 border border-border">
                  <AvatarImage
                    src={profile?.avatar_url || "/placeholder.svg"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {profile?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">
                    {profile?.full_name || "Kullanıcı"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {profile?.role === "coach" ? "Koç" : "Sporcu"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass border-border">
              <DropdownMenuItem
                className="cursor-pointer hover:bg-secondary"
                onClick={() => navigate("/content")}
              >
                <User className="w-4 h-4 mr-2" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer hover:bg-secondary"
                onClick={() => navigate("/settings")}
              >
                <Settings className="w-4 h-4 mr-2" />
                Ayarlar
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="cursor-pointer hover:bg-secondary text-destructive"
                onClick={async () => {
                  await signOut();
                  navigate("/login");
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}
