'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { C, S } from '@/lib/theme';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (profile?.role === 'manager') router.replace('/report');
    if (profile?.role === 'owner') router.replace('/dashboard');
  }, [user, profile, loading, router]);

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: C.textDim }}>확인 중...</div>;
  }

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 65px)', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `radial-gradient(circle at 1px 1px, ${C.accent} 1px, transparent 0)`,
        backgroundSize: '32px 32px',
      }} />

      <div style={{
        position: 'relative', maxWidth: '680px', margin: '0 auto',
        padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{ height: '1px', width: '48px', backgroundColor: C.accent }} />
          <span style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', color: C.accent }}>
            Daily Report System
          </span>
          <div style={{ height: '1px', width: '48px', backgroundColor: C.accent }} />
        </div>

        <h1 style={{ fontSize: 'clamp(48px, 7vw, 84px)', fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: '32px' }}>
          오늘의 <em style={{ color: C.accent, fontStyle: 'italic' }}>마감</em>을<br/>
          기록합니다
        </h1>

        <Link
          href="/login"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            borderRadius: '8px',
            backgroundColor: C.accent,
            color: C.bg,
            fontWeight: 600,
            fontSize: '15px',
          }}
        >
          로그인
        </Link>
      </div>
    </div>
  );
}
