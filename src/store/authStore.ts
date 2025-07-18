import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    set({ user: data.user, session: data.session });
  },
  signUp: async (email, password) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    if (authData.user) {
      const username = email.split('@')[0].toLowerCase().trim();
      
      // Check if username already exists
      const { data: existingProfile, error: existingProfileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (existingProfileError) {
        console.error('Profile check error:', existingProfileError);
        await supabase.auth.signOut();
        throw new Error('Failed to check username availability');
      }

      if (existingProfile) {
        await supabase.auth.signOut();
        throw new Error('Username already exists. Please use a different email.');
      }
      
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: username,
          full_name: username,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        await supabase.auth.signOut();
        throw new Error('Failed to create user profile');
      }

      // Set initial balance
      const { error: balanceError } = await supabase
        .from('balances')
        .insert({
          user_id: authData.user.id,
          amount: 10000 // Initial balance of ₹10,000
        });

      if (balanceError) {
        console.error('Balance error:', balanceError);
        await supabase.auth.signOut();
        throw new Error('Failed to set initial balance');
      }

      set({ user: authData.user, session: authData.session });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));