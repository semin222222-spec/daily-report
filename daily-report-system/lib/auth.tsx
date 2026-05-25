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
  // 이미 프로필을 불러온 user id (탭 복귀 등으로 인한 중복 로드 방지)
  const loadedFor = useRef<string | null>(null);

  // 프로필 로드. 성공했을 때만 상태를 교체한다.
  // 타임아웃/실패 시 기존 프로필을 절대 null로 덮지 않는다.
  // (느린 네트워크에서 프로필이 null이 되어 '확인 중...'에 갇히는 현상 방지)
  const loadProfile = async (userId: string, force = false) => {
    if (!force && loadedFor.current === userId) return;
    try {
      const timeout = new Promise<'TIMEOUT'>((resolve) =>
        setTimeout(() => resolve('TIMEOUT'), 8000)
      );
      const query = supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const result = await Promise.race([query, timeout]);
      if (result === 'TIMEOUT') {
        console.warn('프로필 로드 타임아웃 — 기존 상태 유지');
        return;
      }
      if (result.error) {
        console.error('프로필 로드 실패:', result.error);
        return;
      }
      if (result.data) {
        setProfile(result.data as UserProfile);
        loadedFor.current = userId;
      }
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
    // ⚠️ 콜백 안에서 supabase 쿼리를 await 하면 gotrue 내부 락과 교착(deadlock)이 일어나
    //    프로필 로드가 멈추고 '확인 중...'에 갇힌다(탭 복귀 때마다 SIGNED_IN 재발생).
    //    그래서 콜백은 동기로 두고, 프로필 로드는 락 밖(setTimeout 0)에서 실행한다.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log('Auth event:', event); // 디버깅용

      // TOKEN_REFRESHED, USER_UPDATED: user 정보만 갱신. 프로필/loading은 건드리지 않는다.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
        return;
      }

      // SIGNED_IN: 탭 복귀 시에도 발생. 같은 유저면 loadProfile 내부에서 skip된다.
      if (event === 'SIGNED_IN') {
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          const uid = session.user.id;
          setTimeout(() => { if (mounted) loadProfile(uid); }, 0);
        }
        return;
      }

      // SIGNED_OUT: 로그아웃
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        loadedFor.current = null;
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