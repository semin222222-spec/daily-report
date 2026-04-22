'use client';

import { useEffect, useState } from 'react';
import RequireRole from '@/components/RequireRole';
import UrgentAlerts from '@/components/UrgentAlerts';
import RecentReports from '@/components/RecentReports';
import MonthlyCalendar from '@/components/MonthlyCalendar';
import MonthCompareChart from '@/components/MonthCompareChart';
import ReportDetailModal from '@/components/ReportDetailModal';
import {
  STORES, DailyReport,
  getTodayIssues, getRecentReports, getMonthComparison,
} from '@/lib/supabase';
import { C, S, formatKRW, formatCompact } from '@/lib/theme';

export default function DashboardPage() {
  return (
    <RequireRole allow={['owner']}>
      <DashboardInner />
    </RequireRole>
  );
}

function DashboardInner() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [storeFilter, setStoreFilter] = useState<string>('전체');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [todayIssues, setTodayIssues] = useState<Record<string, string[]>>({});
  const [recentReports, setRecentReports] = useState<DailyReport[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      getTodayIssues(),
      getRecentReports(5),
      getMonthComparison(year, month),
    ]).then(([issues, recent, cmp]) => {
      setTodayIssues(issues);
      setRecentReports(recent);
      setSummary(cmp);
    });
  }, [year, month, selectedDate]);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  const totalDiff = summary ? summary.current.total - summary.previous.total : 0;
  const diffPct = summary && summary.previous.total > 0
    ? ((summary.current.total - summary.previous.total) / summary.previous.total) * 100
    : 0;

  return (
    <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '20px 14px 80px' }}>
      <header style={{
        marginBottom: '24px',
        borderBottom: `1px solid ${C.border}`, paddingBottom: '20px',
      }}>
        <div style={{ ...S.mono, marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', color: C.accent }}>
          Owner Dashboard
        </div>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px, 7vw, 42px)', fontWeight: 600, letterSpacing: '-0.02em', color: C.text, lineHeight: 1.1 }}>
          매출 대시보드
        </h1>
        <div style={{ marginTop: '6px', fontSize: '13px', color: C.textDim }}>
          날짜 클릭해서 상세 보기
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

      <UrgentAlerts issues={todayIssues} />

      {recentReports.length > 0 && (
        <RecentReports reports={recentReports} onOpen={(d) => setSelectedDate(d)} />
      )}

      {summary && (
        <div style={{
          marginBottom: '24px',
          display: 'grid',
          gap: '10px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        }}>
          <KPICard
            label="이번달 누적"
            subLabel={summary.currentLabel}
            value={formatCompact(summary.current.total) + '원'}
            accent
          />
          <KPICard
            label="전월"
            subLabel={summary.previousLabel}
            value={formatCompact(summary.previous.total) + '원'}
          />
          <KPICard
            label="전월 대비"
            subLabel={`${totalDiff >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`}
            value={`${totalDiff >= 0 ? '+' : ''}${formatCompact(totalDiff)}원`}
            trend={totalDiff >= 0 ? 'up' : 'down'}
          />
        </div>
      )}

      {/* 매장 필터 - 가로 스크롤 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim, marginBottom: '8px' }}>
          Filter · 매장
        </div>
        <div className="scroll-x" style={{
          display: 'flex',
          gap: '8px',
          paddingBottom: '4px',
          overflowX: 'auto',
          margin: '0 -14px',
          padding: '0 14px 4px',
        }}>
          {['전체', ...STORES].map((s) => {
            const active = storeFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStoreFilter(s)}
                style={{
                  borderRadius: '9999px',
                  border: `1px solid ${active ? C.accent : C.border}`,
                  backgroundColor: active ? C.accent : C.bgCard,
                  color: active ? '#ffffff' : C.textDim,
                  padding: '8px 16px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minHeight: '36px',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <MonthlyCalendar
        year={year}
        month={month}
        storeFilter={storeFilter}
        onDateClick={(d) => setSelectedDate(d)}
      />

      <MonthCompareChart year={year} month={month} />

      {selectedDate && (
        <ReportDetailModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

function KPICard({ label, subLabel, value, trend, accent }: {
  label: string; subLabel: string; value: string; trend?: 'up' | 'down'; accent?: boolean;
}) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: '14px',
      border: `1px solid ${accent ? C.accent : C.border}`,
      background: accent ? `linear-gradient(135deg, rgba(160, 124, 44, 0.08), transparent)` : C.bgCard,
      padding: '14px 16px',
    }}>
      <div style={{
        ...S.mono, marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim,
        gap: '8px',
      }}>
        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ color: accent ? C.accent : 'inherit', whiteSpace: 'nowrap' }}>{subLabel}</span>
      </div>
      <div style={{
        ...S.mono, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em',
        color: trend === 'up' ? C.success : trend === 'down' ? C.warning : accent ? C.accent : C.text,
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  );
}