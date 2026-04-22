'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (profile && !allow.includes(profile.role)) {
      router.replace(profile.role === 'owner' ? '/dashboard' : '/report');
    }
  }, [user, profile, loading, allow, router]);

  if (loading || !user || !profile) {
    return <div style={{ padding: '60px', textAlign: 'center', color: C.textDim }}>확인 중...</div>;
  }
  if (!allow.includes(profile.role)) return null;

  return <>{children}</>;
}
