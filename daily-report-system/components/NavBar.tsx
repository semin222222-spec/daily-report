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
        maxWidth: '1152px', margin: '0 auto',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px',
      }}>
        <Link href="/" style={{
          textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: '8px',
          minWidth: 0, flex: '0 1 auto',
        }}>
          <span style={{
            ...S.mono,
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            color: C.accent,
            whiteSpace: 'nowrap',
          }}>
            DAILY REPORT
          </span>
        </Link>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          minWidth: 0,
        }}>
          {user ? (
            <>
              <span style={{
                color: C.textDim,
                fontSize: '12px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '45vw',
              }}>
                {profile?.store_name || (profile?.role === 'owner' ? '사장님' : user.email)}
              </span>
              <button
                onClick={signOut}
                style={{
                  border: `1px solid ${C.border}`,
                  backgroundColor: 'transparent',
                  color: C.textDim,
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: '32px',
                }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/login" style={{
              color: C.accent,
              padding: '6px 12px',
              fontSize: '13px',
            }}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}