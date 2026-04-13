import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileData {
  name: string;
  username: string;
  title: string;
  bio: string;
  avatarUrl: string;
  followers: number;
  following: number;
  posts: number;
  engagement: string;
}

interface ProfileContextType {
  profile: ProfileData;
  updateProfile: (updates: Partial<ProfileData>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { profile: authProfile } = useAuth();

  const [profile, setProfile] = useState<ProfileData>({
    name: authProfile?.full_name || "",
    username: authProfile?.email ? `@${authProfile.email.split("@")[0]}` : "",
    title: authProfile?.specialty || "",
    bio: authProfile?.bio || "",
    avatarUrl: authProfile?.avatar_url || "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: "0%",
  });

  // Sync when authProfile changes (login, refreshProfile)
  useEffect(() => {
    if (authProfile) {
      setProfile((prev) => ({
        ...prev,
        name: authProfile.full_name || "",
        username: authProfile.email ? `@${authProfile.email.split("@")[0]}` : "",
        title: authProfile.specialty || prev.title,
        bio: authProfile.bio || prev.bio,
        avatarUrl: authProfile.avatar_url || "",
      }));
    }
  }, [authProfile]);

  const updateProfile = (updates: Partial<ProfileData>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
