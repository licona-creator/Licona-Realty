import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  faceIdEnabled: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setFaceIdEnabled: (enabled: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  faceIdEnabled: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (isLoading) => set({ isLoading }),
  setFaceIdEnabled: (faceIdEnabled) => set({ faceIdEnabled }),
}));
