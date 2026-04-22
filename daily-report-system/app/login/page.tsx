'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { C, S } from '@/lib/theme';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%', maxWidth: '400px',
          borderRadius: '16px', border: `1px solid ${C.border}`,
          backgroundColor: 'rgba(20, 17, 15, 0.6)',
          padding: '40px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.accent }}>
            Sign in
          </div>
          <h1 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 600, color: C.text }}>
            로그인
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={S.label}>이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@example.com"
              style={S.input}
            />
          </div>

          <div>
            <label style={S.label}>비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={S.input}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: C.danger, margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
              backgroundColor: C.accent, color: C.bg,
              fontWeight: 600, fontSize: '15px', cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </form>
    </div>
  );
}
