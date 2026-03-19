import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'coach' | 'athlete' | null;
  avatar_url: string | null;
  coach_id: string | null;
  created_at: string | null;
  bio: string | null;
  gym_name: string | null;
  specialty: string | null;
  subscription_tier: string | null;
  notification_preferences: {
    email: boolean;
    push: boolean;
    alerts: boolean;
  } | null;
  notification_settings: {
    email: boolean;
    push: boolean;
    alerts: boolean;
  } | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: 'coach' | 'athlete' | null;
  isLoading: boolean;
  teamMember: any | null;
  isSubCoach: boolean;
  activeCoachId: string | null;
  teamMemberPermissions: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, role: 'coach' | 'athlete', fullName: string, inviteToken?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<'coach' | 'athlete' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teamMember, setTeamMember] = useState<any | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      const p = data as any;
      const profileData: Profile = {
        id: p.id,
        email: p.email ?? null,
        full_name: p.full_name ?? null,
        role: p.role ?? null,
        avatar_url: p.avatar_url ?? null,
        coach_id: p.coach_id ?? null,
        created_at: p.created_at ?? null,
        bio: p.bio ?? null,
        gym_name: p.gym_name ?? null,
        specialty: p.specialty ?? null,
        subscription_tier: p.subscription_tier ?? null,
        notification_preferences: p.notification_preferences ?? null,
        notification_settings: p.notification_settings ?? null,
      };
      setProfile(profileData);
      setRole(profileData.role);
    }

    // Fetch team_members linkage for sub-coach detection
    const { data: teamData } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    setTeamMember(teamData ?? null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          setTimeout(() => {
            fetchProfile(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return { error };
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string, selectedRole: 'coach' | 'athlete', fullName: string, inviteToken?: string) => {
    const metadata: Record<string, string> = { full_name: fullName, role: selectedRole };
    if (inviteToken) metadata.invite_token = inviteToken;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
      return { error };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setTeamMember(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const isSubCoach = !!teamMember;
  const activeCoachId = teamMember ? teamMember.head_coach_id : user?.id ?? null;
  const teamMemberPermissions = teamMember?.permissions ?? null;

  return (
    <AuthContext.Provider value={{ user, session, profile, role, isLoading, teamMember, isSubCoach, activeCoachId, teamMemberPermissions, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
