'use client';

import { useEffect, useMemo, useState } from 'react';
import { DailyReport, getMonthReports } from '@/lib/supabase';
import { C, S, formatKRW, formatCompact } from '@/lib/theme';

export default function MonthlyCalendar({
  year,
  month,
  storeFilter,
  onDateClick,
}: {
  year: number;
  month: number;
  storeFilter: string;
  onDateClick: (date: string) => void;
}) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMonthReports(year, month)
      .then(setReports)
      .finally(() => setLoading(false));
  }, [year, month]);

  const { dailyTotals, monthTotal, maxDaily, datesWithReports } = useMemo(() => {
    const filtered = storeFilter === '전체' ? reports : reports.filter((r) => r.store_name === storeFilter);
    const totals: Record<string, number> = {};
    const dates = new Set<string>();
    let total = 0;
    for (const r of filtered) {
      totals[r.report_date] = (totals[r.report_date] || 0) + Number(r.total_sales);
      dates.add(r.report_date);
      total += Number(r.total_sales);
    }
    return { dailyTotals: totals, monthTotal: total, maxDaily: Math.max(1, ...Object.values(totals)), datesWithReports: dates };
  }, [reports, storeFilter]);

  const grid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0).getDate();
    const startWeekday = firstDay.getDay();
    const cells: ({ date: number; dateStr: string } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= lastDate; d++) {
      cells.push({
        date: d,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  return (
    <div style={{ ...S.card, marginBottom: '24px', padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.accent }}>
          Sales Calendar
        </div>
        <h2 style={{ margin: '4px 0 2px', fontSize: '18px', fontWeight: 600, color: C.text }}>
          일별 매출 히트맵
        </h2>
        <p style={{ margin: 0, fontSize: '12px', color: C.textDim }}>
          {storeFilter === '전체' ? '전 매장 합계' : storeFilter}
        </p>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
            Month Total
          </span>
          <span style={{ ...S.mono, fontSize: '20px', fontWeight: 600, color: C.accent }}>
            {formatCompact(monthTotal)}원
          </span>
        </div>
      </div>

      {loading && <div style={{ padding: '20px', textAlign: 'center', color: C.textDim }}>로딩 중...</div>}

      {!loading && (
        <>
          <div style={{ marginBottom: '6px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div
                key={d}
                style={{
                  ...S.mono,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: i === 0 ? C.warning : i === 6 ? '#6b8e9e' : C.textFaint,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {grid.map((cell, idx) => {
              if (!cell) return <div key={idx} style={{ aspectRatio: '1 / 1' }} />;
              const sales = dailyTotals[cell.dateStr] || 0;
              const intensity = sales / maxDaily;
              const hasData = sales > 0;
              const hasReport = datesWithReports.has(cell.dateStr);
              const isDark = intensity > 0.6;
              return (
                <button
                  key={idx}
                  onClick={() => hasReport && onDateClick(cell.dateStr)}
                  title={hasReport ? `${cell.dateStr} - ${formatKRW(sales)}` : cell.dateStr}
                  style={{
                    aspectRatio: '1 / 1',
                    position: 'relative',
                    borderRadius: '8px',
                    border: hasReport ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`,
                    padding: '4px',
                    backgroundColor: hasData
                      ? `rgba(160, 124, 44, ${0.1 + intensity * 0.75})`
                      : C.bg,
                    cursor: hasReport ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                  }}
                >
                  <div style={{
                    ...S.mono,
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isDark ? '#ffffff' : C.text,
                    lineHeight: 1,
                  }}>
                    {cell.date}
                  </div>
                  {hasData && (
                    <div style={{
                      ...S.mono,
                      fontSize: '9px',
                      fontWeight: 500,
                      color: isDark ? 'rgba(255,255,255,0.9)' : C.textDim,
                      lineHeight: 1,
                    }}>
                      {formatCompact(sales)}
                    </div>
                  )}
                  {hasReport && !hasData && (
                    <div style={{
                      position: 'absolute', top: '4px', right: '4px',
                      height: '5px', width: '5px', borderRadius: '50%',
                      backgroundColor: C.accent,
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {datesWithReports.size > 0 && (
            <div style={{
              ...S.mono, marginTop: '12px', fontSize: '10px',
              color: C.textDim, textAlign: 'center',
            }}>
              날짜 클릭해서 상세 보기
            </div>
          )}
        </>
      )}
    </div>
  );
}