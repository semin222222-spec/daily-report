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
import { C, S, formatKRW } from '@/lib/theme';

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

  return (
    <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '40px 24px' }}>
      <header style={{
        marginBottom: '40px', display: 'flex', flexWrap: 'wrap',
        alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px',
        borderBottom: `1px solid ${C.border}`, paddingBottom: '32px',
      }}>
        <div>
          <div style={{ ...S.mono, marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', color: C.accent }}>
            Owner Dashboard
          </div>
          <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 600, letterSpacing: '-0.02em', color: C.text }}>
            매출 대시보드
          </h1>
          <div style={{ marginTop: '8px', fontSize: '14px', color: C.textDim }}>
            전 매장 조회 · 캘린더 날짜 클릭해서 상세 보기
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={prevMonth}
            style={{ height: '40px', width: '40px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, color: C.textDim, cursor: 'pointer', fontSize: '16px' }}
          >←</button>
          <div style={{ borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, padding: '8px 20px' }}>
            <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
              Period
            </div>
            <div style={{ ...S.mono, fontSize: '18px', color: C.text }}>
              {year}.{String(month).padStart(2, '0')}
            </div>
          </div>
          <button
            onClick={nextMonth}
            style={{ height: '40px', width: '40px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, color: C.textDim, cursor: 'pointer', fontSize: '16px' }}
          >→</button>
        </div>
      </header>

      <UrgentAlerts issues={todayIssues} />

      {recentReports.length > 0 && (
        <RecentReports reports={recentReports} onOpen={(d) => setSelectedDate(d)} />
      )}

      {summary && (
        <div style={{ marginBottom: '32px', display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <KPICard label="이번달 누적" subLabel={summary.currentLabel} value={formatKRW(summary.current.total)} accent />
          <KPICard label="전월" subLabel={summary.previousLabel} value={formatKRW(summary.previous.total)} />
          <KPICard
            label="전월 대비"
            subLabel={`${summary.current.total - summary.previous.total >= 0 ? '+' : ''}${
              summary.previous.total > 0
                ? ((summary.current.total - summary.previous.total) / summary.previous.total * 100).toFixed(1)
                : '0.0'
            }%`}
            value={`${summary.current.total - summary.previous.total >= 0 ? '+' : ''}${formatKRW(summary.current.total - summary.previous.total)}`}
            trend={summary.current.total - summary.previous.total >= 0 ? 'up' : 'down'}
          />
        </div>
      )}

      <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...S.mono, marginRight: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
          Filter
        </span>
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
                padding: '6px 16px', fontSize: '12px', cursor: 'pointer',
                fontWeight: active ? 600 : 400,
              }}
            >
              {s}
            </button>
          );
        })}
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
      position: 'relative', overflow: 'hidden', borderRadius: '16px',
      border: `1px solid ${accent ? C.accent : C.border}`,
      background: accent ? `linear-gradient(135deg, rgba(160, 124, 44, 0.08), transparent)` : C.bgCard,
      padding: '24px',
    }}>
      <div style={{
        ...S.mono, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim,
      }}>
        <span>{label}</span>
        <span style={{ color: accent ? C.accent : 'inherit' }}>{subLabel}</span>
      </div>
      <div style={{
        ...S.mono, fontSize: '24px', fontWeight: 600, letterSpacing: '-0.01em',
        color: trend === 'up' ? C.success : trend === 'down' ? C.warning : accent ? C.accent : C.text,
      }}>
        {value}
      </div>
      {trend && (
        <div style={{ ...S.mono, marginTop: '8px', fontSize: '12px', color: trend === 'up' ? C.success : C.warning }}>
          {trend === 'up' ? '↗' : '↘'} 전월 대비
        </div>
      )}
    </div>
  );
}