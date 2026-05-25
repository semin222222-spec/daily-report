'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { C } from '@/lib/theme';

export default function RequireRole({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow: ('owner' | 'manager')[];
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (profile && !allow.includes(profile.role)) {
      router.replace(profile.role === 'owner' ? '/dashboard' : '/report');
    }
  }, [user, profile, loading, allow, router]);

  // 로딩이든 프로필 미로드든, 가드에 막혀있는 상태가 일정 시간 지속되면
  // 탈출구(다시 로그인) 노출
  const blocked = loading || !user || !profile;
  useEffect(() => {
    if (!blocked) { setShowReload(false); return; }
    const t = setTimeout(() => setShowReload(true), 4000);
    return () => clearTimeout(t);
  }, [blocked]);

  if (blocked) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: C.textDim }}>
        <div>확인 중...</div>
        {showReload && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ marginBottom: '16px', fontSize: '13px' }}>
              오래 걸리시나요?
            </div>
            <button
              onClick={() => {
                Object.keys(localStorage).forEach((k) => {
                  if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k);
                });
                Object.keys(sessionStorage).forEach((k) => {
                  if (k.startsWith('sb-') || k.includes('supabase')) sessionStorage.removeItem(k);
                });
                window.location.href = '/login';
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: `1px solid ${C.accent}`,
                backgroundColor: C.accent,
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              다시 로그인하기
            </button>
          </div>
        )}
      </div>
    );
  }
  if (!allow.includes(profile.role)) return null;

  return <>{children}</>;
}