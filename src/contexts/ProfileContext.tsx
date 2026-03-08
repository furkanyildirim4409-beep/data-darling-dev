import { createContext, useContext, useState, ReactNode } from "react";

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

const defaultProfile: ProfileData = {
  name: "Koç Davis",
  username: "@koc_davis",
  title: "Profesyonel Fitness Koçu",
  bio: "10+ yıl deneyim | 500+ başarı hikayesi | Online & Yüz yüze koçluk",
  avatarUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
  followers: 12500,
  following: 342,
  posts: 287,
  engagement: "4.8%",
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);

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