'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const initialized = useRef(false);

  const loadProfile = async (userId: string) => {
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
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
    }
  };

  useEffect(() => {
    let mounted = true;
    let safetyTimer: NodeJS.Timeout;

    // 🔥 안전장치: 첫 로딩 때만 작동 (10초로 늘림)
    safetyTimer = setTimeout(() => {
      if (mounted && !initialized.current) {
        console.warn('⚠️ 첫 로딩 타임아웃');
        setLoading(false);
      }
    }, 10000);

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
      } finally {
        if (mounted) {
          clearTimeout(safetyTimer);
          initialized.current = true;
          setLoading(false);
        }
      }
    };

    init();

    // 🔥 핵심 수정: 이벤트별로 다르게 처리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth event:', event); // 디버깅용

      // TOKEN_REFRESHED, USER_UPDATED 같은 이벤트는 user 정보만 업데이트하고 끝
      // 프로필 다시 로드 안 함, loading도 안 건드림
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
        return;
      }

      // SIGNED_IN: 로그인할 때만 프로필 로드
      if (event === 'SIGNED_IN') {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
        setLoading(false);
        return;
      }

      // SIGNED_OUT: 로그아웃
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // INITIAL_SESSION: 첫 진입 (init에서 처리하니까 무시)
      if (event === 'INITIAL_SESSION') {
        return;
      }
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