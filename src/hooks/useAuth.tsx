import React, { createContext, useContext, useState, useEffect } from 'react';

/*
 * ══════════════════════════════════════════════════
 * AUTH with Guest Mode
 * ──────────────────────────────────────────────────
 * Users can use the tool without signing in.
 * Login is optional — only needed for cloud save
 * with Supabase later.
 *
 * Demo accounts:
 *   demo@odt.com   / demo123
 *   admin@odt.com  / admin123
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('odt_demo_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!email || !password) return { error: 'Email and password are required' };
    if (password.length < 6) return { error: 'Password must be at least 6 characters' };
    const u: User = {
      id: 'user-' + Date.now(),
      email,
      user_metadata: { username: email.split('@')[0] },
    };
    setUser(u);
    localStorage.setItem('odt_demo_user', JSON.stringify(u));
    return { error: null };
  };

  const signUp = async (email: string, password: string, username: string): Promise<{ error: string | null }> => {
    if (password.length < 6) return { error: 'Password must be at least 6 characters' };
    const u: User = {
      id: 'user-' + Date.now(),
      email,
      user_metadata: { username: username || email.split('@')[0] },
    };
    setUser(u);
    localStorage.setItem('odt_demo_user', JSON.stringify(u));
    return { error: null };
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('odt_demo_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isGuest: !user,
      signUp,
      signIn,
      signOut,
    }}>
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
