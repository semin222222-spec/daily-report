'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { C, S } from '@/lib/theme';

export default function NavBar() {
  const { user, profile, signOut } = useAuth();

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      borderBottom: `1px solid ${C.border}`,
      backgroundColor: 'rgba(250, 247, 242, 0.95)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        maxWidth: '1152px', margin: '0 auto', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', color: C.accent }}>
            Daily Report
          </span>
          <span style={{ width: '1px', height: '16px', backgroundColor: C.border }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>
            매장 마감 보고 시스템
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
          {profile?.role === 'manager' && (
            <Link href="/report" style={{ color: C.textDim, textDecoration: 'none' }}>마감 보고</Link>
          )}
          {profile?.role === 'owner' && (
            <Link href="/dashboard" style={{ color: C.textDim, textDecoration: 'none' }}>대시보드</Link>
          )}

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: C.textDim }}>
                {profile?.display_name || user.email}
                {profile?.store_name && ` · ${profile.store_name}`}
                {profile?.role === 'owner' && ' · 사장님'}
              </span>
              <button
                onClick={signOut}
                style={{
                  border: `1px solid ${C.border}`, backgroundColor: 'transparent',
                  color: C.textDim, fontSize: '12px', padding: '4px 12px',
                  borderRadius: '6px', cursor: 'pointer',
                }}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link href="/login" style={{ color: C.accent, textDecoration: 'none' }}>로그인</Link>
          )}
        </div>
      </div>
    </nav>
  );
}