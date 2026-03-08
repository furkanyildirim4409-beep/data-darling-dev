import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  full_name: string;
  role: 'coach' | 'athlete';
  avatar_url: string | null;
  email: string;
  created_at: string;
}

interface LocalUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: LocalUser | null;
  session: any;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, role: 'coach' | 'athlete', fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'dynabolic_auth';
const USERS_STORAGE_KEY = 'dynabolic_users';

function getStoredUsers(): Record<string, { password: string; profile: Profile }> {
  try {
    return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getStoredAuth(): { user: LocalUser; profile: Profile } | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setUser(stored.user);
      setProfile(stored.profile);
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const users = getStoredUsers();
    const entry = users[email.toLowerCase()];
    if (!entry || entry.password !== password) {
      const msg = 'Geçersiz e-posta veya şifre.';
      toast.error(msg);
      return { error: { message: msg } };
    }
    const localUser: LocalUser = { id: entry.profile.id, email: entry.profile.email };
    setUser(localUser);
    setProfile(entry.profile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: localUser, profile: entry.profile }));
    return { error: null };
  };

  const signUp = async (email: string, password: string, role: 'coach' | 'athlete', fullName: string) => {
    const users = getStoredUsers();
    const key = email.toLowerCase();
    if (users[key]) {
      const msg = 'Bu e-posta zaten kayıtlı.';
      toast.error(msg);
      return { error: { message: msg } };
    }
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      full_name: fullName,
      role,
      avatar_url: null,
      email: key,
      created_at: new Date().toISOString(),
    };
    users[key] = { password, profile: newProfile };
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return { error: null };
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, session: user ? {} : null, profile, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);