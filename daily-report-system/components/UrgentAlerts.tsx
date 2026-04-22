'use client';

import { STORES, ISSUE_LABEL, ISSUE_ICON } from '@/lib/supabase';
import { C, S } from '@/lib/theme';

export default function UrgentAlerts({ issues }: { issues: Record<string, string[]> }) {
  const alertStores = STORES.filter((s) => issues[s] && issues[s].length > 0);
  const totalIssues = alertStores.reduce((sum, s) => sum + issues[s].length, 0);

  if (alertStores.length === 0) {
    return (
      <div style={{ ...S.card, marginBottom: '32px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '48px', width: '48px', borderRadius: '50%',
            backgroundColor: 'rgba(107, 142, 78, 0.15)', fontSize: '24px',
          }}>✓</div>
          <div>
            <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.success }}>
              All Clear
            </div>
            <div style={{ marginTop: '2px', fontSize: '18px', fontWeight: 600, color: C.text }}>
              특이사항 없음
            </div>
            <div style={{ fontSize: '12px', color: C.textDim }}>
              오늘 아직 이슈가 보고되지 않았습니다
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        .ping-dot { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>

      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', height: '12px', width: '12px' }}>
            <span className="ping-dot" style={{
              position: 'absolute', display: 'inline-flex',
              height: '100%', width: '100%', borderRadius: '50%',
              backgroundColor: C.dangerBright, opacity: 0.75,
            }} />
            <span style={{
              position: 'relative', display: 'inline-flex',
              height: '12px', width: '12px', borderRadius: '50%',
              backgroundColor: C.dangerBright,
            }} />
          </div>
          <div>
            <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', color: C.dangerBright }}>
              Urgent Alerts
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: C.text }}>
              오늘의 긴급 알림
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...S.mono, fontSize: '24px', fontWeight: 700, color: C.dangerBright }}>
            {totalIssues}
          </div>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
            {alertStores.length}개 매장
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {alertStores.map((store) => (
          <AlertCard key={store} store={store} issueKeys={issues[store]} />
        ))}
      </div>
    </div>
  );
}

function AlertCard({ store, issueKeys }: { store: string; issueKeys: string[] }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: '12px',
      background: `linear-gradient(135deg, ${C.dangerBright} 0%, ${C.danger} 50%, ${C.dangerDeep} 100%)`,
      border: `2px solid ${C.dangerBright}`,
      boxShadow: '0 20px 40px -10px rgba(239, 68, 68, 0.4)',
      padding: '20px',
    }}>
      <div style={{
        position: 'absolute', right: '-32px', top: '-32px',
        height: '128px', width: '128px', borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.15)', filter: 'blur(32px)',
      }} />

      <div style={{ position: 'relative', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255, 255, 255, 0.75)' }}>
            Store
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>{store}</div>
        </div>
        <div style={{
          ...S.mono, display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '40px', width: '40px', borderRadius: '50%',
          backgroundColor: '#ffffff', color: C.danger,
          fontSize: '18px', fontWeight: 700,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        }}>
          {issueKeys.length}
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {issueKeys.map((key) => (
          <span key={key} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            borderRadius: '9999px',
            backgroundColor: '#ffffff', color: C.dangerDeep,
            padding: '4px 10px', fontSize: '12px', fontWeight: 700,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}>
            <span>{ISSUE_ICON[key]}</span>
            <span>{ISSUE_LABEL[key]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
