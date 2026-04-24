'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export type UserProfile = {
  user_id: string;
  role: 'owner' | 'manager';
  store_name: string | null;
  display_name: string | null;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// 세션 꼬였을 때 완전 초기화
function clearAllAuth() {
  if (typeof window === 'undefined') return;
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k);
    });
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith('sb-') || k.includes('supabase')) sessionStorage.removeItem(k);
    });
  } catch (e) {
    console.error('세션 초기화 실패:', e);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      const query = supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
        .then((r) => r.data);

      const data = await Promise.race([query, timeout]);
      setProfile(data as UserProfile | null);
    } catch (err) {
      console.error('프로필 로드 실패:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    let safetyTimer: NodeJS.Timeout;

    // 안전장치: 5초 안에 로딩 안 풀리면 강제 초기화
    safetyTimer = setTimeout(() => {
      if (mounted && typeof window !== 'undefined') {
        console.warn('⚠️ 로딩 타임아웃 - 세션 초기화');
        clearAllAuth();
        setLoading(false);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }, 5000);

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } catch (err) {
        console.error('세션 초기화 실패:', err);
        clearAllAuth();
      } finally {
        if (mounted) {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    setProfile(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('로그아웃 에러:', e);
    }
    clearAllAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}