'use client';

import { useEffect, useState } from 'react';
import RequireRole from '@/components/RequireRole';
import MonthlyCalendar from '@/components/MonthlyCalendar';
import ReportDetailModal from '@/components/ReportDetailModal';
import { useAuth } from '@/lib/auth';
import { DailyReport, getMonthReports, StoreName } from '@/lib/supabase';
import { C, S, formatKRW, formatCompact } from '@/lib/theme';

export default function MyDashboardPage() {
  return (
    <RequireRole allow={['manager']}>
      <MyDashboardInner />
    </RequireRole>
  );
}

function MyDashboardInner() {
  const { profile } = useAuth();
  const myStore = profile?.store_name as StoreName;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);

  useEffect(() => {
    getMonthReports(year, month).then(setReports);
  }, [year, month, selectedDate]);

  const myReports = reports.filter((r) => r.store_name === myStore);
  const monthTotal = myReports.reduce((sum, r) => sum + Number(r.total_sales), 0);
  const reportCount = myReports.length;
  const avgDaily = reportCount > 0 ? Math.round(monthTotal / reportCount) : 0;

  // 이슈가 있는 날 카운트
  const issueCount = myReports.reduce((sum, r) => sum + (r.issues?.length || 0), 0);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  return (
    <div style={{ maxWidth: '768px', margin: '0 auto', padding: '20px 14px 80px' }}>
      <header style={{
        marginBottom: '24px',
        borderBottom: `1px solid ${C.border}`, paddingBottom: '20px',
      }}>
        <div style={{ ...S.mono, marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', color: C.accent }}>
          My Store Dashboard
        </div>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px, 7vw, 36px)', fontWeight: 600, letterSpacing: '-0.02em', color: C.text, lineHeight: 1.1 }}>
          내 매장 매출
        </h1>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: C.textDim, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            borderRadius: '9999px', padding: '4px 10px',
            backgroundColor: 'rgba(160, 124, 44, 0.12)', color: C.accent,
            fontWeight: 600,
          }}>
            <span style={{ height: '5px', width: '5px', borderRadius: '50%', backgroundColor: C.accent }} />
            {myStore}
          </span>
          <span>{profile?.display_name}</span>
        </div>

        {/* 월 이동 */}
        <div style={{
          marginTop: '16px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <button
            onClick={prevMonth}
            style={{ height: '40px', width: '40px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, color: C.textDim, cursor: 'pointer', fontSize: '18px' }}
          >←</button>
          <div style={{ flex: 1, borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ ...S.mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
              Period
            </div>
            <div style={{ ...S.mono, fontSize: '16px', color: C.text }}>
              {year}.{String(month).padStart(2, '0')}
            </div>
          </div>
          <button
            onClick={nextMonth}
            style={{ height: '40px', width: '40px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, color: C.textDim, cursor: 'pointer', fontSize: '18px' }}
          >→</button>
        </div>
      </header>

      {/* KPI 3개 */}
      <div style={{
        marginBottom: '24px',
        display: 'grid', gap: '10px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      }}>
        <KPICard label="이번달 매출" value={formatKRW(monthTotal)} accent />
        <KPICard label="작성한 일수" value={`${reportCount}일`} />
        <KPICard label="일평균 매출" value={formatKRW(avgDaily)} />
      </div>

      {issueCount > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 14px',
          borderRadius: '10px',
          backgroundColor: 'rgba(220, 38, 38, 0.06)',
          border: `1px solid ${C.danger}`,
          fontSize: '13px',
          color: C.danger,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>🚨</span>
          <span>이번달 보고된 이슈 {issueCount}건</span>
        </div>
      )}

      {/* 캘린더 */}
      <MonthlyCalendar
        year={year}
        month={month}
        storeFilter={myStore}
        onDateClick={(d) => setSelectedDate(d)}
      />

      {/* 일별 리스트 */}
      {myReports.length > 0 && (
        <div style={{ ...S.card, padding: '16px', marginBottom: '24px' }}>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.accent, marginBottom: '6px' }}>
            Daily List
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600, color: C.text }}>
            일별 매출 (최근부터)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[...myReports]
              .sort((a, b) => b.report_date.localeCompare(a.report_date))
              .map((r) => {
                const hasIssues = r.issues && r.issues.length > 0;
                return (
                  <button
                    key={r.id || r.report_date}
                    onClick={() => setSelectedDate(r.report_date)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${hasIssues ? C.danger : C.border}`,
                      backgroundColor: hasIssues ? 'rgba(220, 38, 38, 0.04)' : C.bg,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      gap: '8px',
                    }}
                  >
                    <div style={{ ...S.mono, fontSize: '12px', color: C.textDim, flexShrink: 0 }}>
                      {r.report_date.slice(5)}
                    </div>
                    <div style={{ ...S.mono, fontSize: '14px', fontWeight: 600, color: C.text, flex: 1, textAlign: 'right' }}>
                      {formatKRW(Number(r.total_sales))}
                    </div>
                    {hasIssues && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        backgroundColor: C.danger, color: '#fff',
                        padding: '2px 6px', borderRadius: '9999px',
                        flexShrink: 0,
                      }}>
                        {r.issues.length}
                      </span>
                    )}
                    <span style={{ color: C.textDim, fontSize: '13px', flexShrink: 0 }}>→</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {selectedDate && (
        <ReportDetailModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

function KPICard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      borderRadius: '14px',
      border: `1px solid ${accent ? C.accent : C.border}`,
      background: accent ? `linear-gradient(135deg, rgba(160, 124, 44, 0.08), transparent)` : C.bgCard,
      padding: '14px 16px',
    }}>
      <div style={{
        ...S.mono, marginBottom: '6px',
        fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim,
      }}>
        {label}
      </div>
      <div style={{
        ...S.mono, fontSize: '20px', fontWeight: 600,
        color: accent ? C.accent : C.text,
        wordBreak: 'break-word',
      }}>
        {value}
      </div>
    </div>
  );
}