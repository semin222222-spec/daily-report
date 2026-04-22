'use client';

import { DailyReport, ISSUE_LABEL, ISSUE_ICON } from '@/lib/supabase';
import { C, S, formatKRW } from '@/lib/theme';

export default function RecentReports({
  reports,
  onOpen,
}: {
  reports: DailyReport[];
  onOpen: (date: string) => void;
}) {
  if (reports.length === 0) return null;

  return (
    <div style={{ ...S.card, marginBottom: '32px', padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.success }}>
            Recently Submitted
          </div>
          <h2 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 600, color: C.text }}>
            방금 제출된 보고서
          </h2>
        </div>
        <span style={{ ...S.mono, fontSize: '10px', color: C.textDim }}>최근 {reports.length}건</span>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        {reports.map((r) => {
          const hasIssues = r.issues && r.issues.length > 0;
          return (
            <button
              key={r.id || `${r.store_name}-${r.report_date}`}
              onClick={() => onOpen(r.report_date)}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '12px 16px', borderRadius: '8px',
                border: `1px solid ${hasIssues ? C.danger : C.border}`,
                backgroundColor: hasIssues ? 'rgba(220, 38, 38, 0.08)' : C.bg,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', color: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ flex: '0 0 auto' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 10px', borderRadius: '9999px',
                  backgroundColor: 'rgba(201, 169, 97, 0.15)', color: C.accent,
                  fontSize: '12px', fontWeight: 600,
                }}>
                  {r.store_name}
                </span>
              </div>
              <div style={{ ...S.mono, fontSize: '12px', color: C.textDim, flex: '0 0 auto' }}>
                {r.report_date}
              </div>
              <div style={{ ...S.mono, fontSize: '14px', fontWeight: 600, color: C.text, flex: '1 1 auto', textAlign: 'right' }}>
                {formatKRW(Number(r.total_sales || 0))}
              </div>
              {hasIssues && (
                <div style={{ display: 'flex', gap: '4px', flex: '0 0 auto' }}>
                  {r.issues.map((key) => (
                    <span
                      key={key}
                      title={ISSUE_LABEL[key]}
                      style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 8px', borderRadius: '9999px',
                        backgroundColor: C.danger, color: '#fff',
                        fontSize: '11px', fontWeight: 700,
                      }}
                    >
                      {ISSUE_ICON[key]}
                    </span>
                  ))}
                </div>
              )}
              <span style={{ color: C.textDim, fontSize: '16px', flex: '0 0 auto' }}>→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
