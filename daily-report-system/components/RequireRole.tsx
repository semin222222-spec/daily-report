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

  // 5초 지나도 loading이 계속이면 "다시 시도" 버튼 표시
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setShowReload(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading || !user || !profile) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: C.textDim }}>
        <div>확인 중...</div>
        {showReload && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ marginBottom: '12px', fontSize: '13px' }}>
              오래 걸리나요?
            </div>
            <button
              onClick={() => {
                Object.keys(localStorage).forEach((k) => {
                  if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k);
                });
                window.location.href = '/login';
              }}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: `1px solid ${C.accent}`,
                backgroundColor: C.accent,
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
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