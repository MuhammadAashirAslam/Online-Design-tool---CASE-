import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

/*
 * ══════════════════════════════════════════════════
 * AUTH — Real Supabase + Guest Mode
 * ──────────────────────────────────────────────────
 * - Authenticated users: data syncs with Supabase
 * - Guests: data stays in localStorage only
 * ══════════════════════════════════════════════════
 */

export interface User {
  id: string;
  email: string;
  user_metadata: { username: string };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(su: SupabaseUser): User {
  return {
    id: su.id,
    email: su.email || '',
    user_metadata: {
      username:
        su.user_metadata?.username ||
        su.email?.split('@')[0] ||
        'User',
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // On mount: check for existing Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        setIsGuest(false);
      } else {
        // Check if user was previously in guest mode
        const guestFlag = localStorage.getItem('odt_guest_mode');
        if (guestFlag === 'true') {
          setIsGuest(true);
        }
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
          setIsGuest(false);
          localStorage.removeItem('odt_guest_mode');
        } else {
          setUser(null);
          // Don't clear guest mode here — only on explicit sign out
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    if (!email || !password)
      return { error: 'Email and password are required' };
    if (password.length < 6)
      return { error: 'Password must be at least 6 characters' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };

    if (data.user) {
      setUser(mapSupabaseUser(data.user));
      setIsGuest(false);
      localStorage.removeItem('odt_guest_mode');
    }

    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    username: string
  ): Promise<{ error: string | null }> => {
    if (!email || !password)
      return { error: 'Email and password are required' };
    if (password.length < 6)
      return { error: 'Password must be at least 6 characters' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username || email.split('@')[0] },
      },
    });

    if (error) {
      // Provide friendlier messages for common errors
      if (error.message.includes('rate limit') || error.message.includes('limit exceeded')) {
        return { error: 'Too many signup attempts. Please wait a few minutes and try again.' };
      }
      return { error: error.message };
    }

    // If email confirmation is disabled, user is immediately authenticated
    if (data.user && data.session) {
      setUser(mapSupabaseUser(data.user));
      setIsGuest(false);
      localStorage.removeItem('odt_guest_mode');
      return { error: null };
    }

    // If email confirmation is enabled, user exists but no session yet
    if (data.user && !data.session) {
      return { error: 'Account created! Please check your email to confirm, then sign in.' };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('odt_guest_mode');
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('odt_guest_mode', 'true');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        signUp,
        signIn,
        signOut,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
