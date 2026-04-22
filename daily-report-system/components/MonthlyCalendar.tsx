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
    <div style={{ ...S.card, marginBottom: '32px', padding: '24px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.accent }}>
            Sales Calendar
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 600, color: C.text }}>
            일별 매출 히트맵
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: C.textDim }}>
            {storeFilter === '전체' ? '전 매장 합계' : storeFilter} · 날짜 클릭 시 상세 보고서 확인
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
            Month Total
          </div>
          <div style={{ ...S.mono, fontSize: '24px', fontWeight: 600, color: C.accent }}>
            {formatKRW(monthTotal)}
          </div>
        </div>
      </div>

      {loading && <div style={{ padding: '20px', textAlign: 'center', color: C.textDim }}>로딩 중...</div>}

      {!loading && (
        <>
          <div style={{ marginBottom: '8px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {grid.map((cell, idx) => {
              if (!cell) return <div key={idx} style={{ aspectRatio: '1 / 1' }} />;
              const sales = dailyTotals[cell.dateStr] || 0;
              const intensity = sales / maxDaily;
              const hasData = sales > 0;
              const hasReport = datesWithReports.has(cell.dateStr);
              return (
                <button
                  key={idx}
                  onClick={() => hasReport && onDateClick(cell.dateStr)}
                  title={hasReport ? `${cell.dateStr} 상세 보기` : cell.dateStr}
                  style={{
                    aspectRatio: '1 / 1',
                    position: 'relative',
                    borderRadius: '8px',
                    border: hasReport ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                    padding: '8px',
                    backgroundColor: hasData
                      ? `rgba(201, 169, 97, ${0.08 + intensity * 0.7})`
                      : C.bg,
                    cursor: hasReport ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ ...S.mono, fontSize: '12px', fontWeight: 600, color: intensity > 0.6 ? C.bg : C.text }}>
                    {cell.date}
                  </div>
                  {hasReport && (
                    <div
                      style={{
                        position: 'absolute', top: '6px', right: '6px',
                        height: '6px', width: '6px', borderRadius: '50%',
                        backgroundColor: C.accent, boxShadow: `0 0 8px ${C.accent}`,
                      }}
                    />
                  )}
                  {hasData && (
                    <div style={{
                      ...S.mono, position: 'absolute', bottom: '6px', right: '6px',
                      fontSize: '9px', fontWeight: 500,
                      color: intensity > 0.6 ? C.bg : C.textDim,
                    }}>
                      {formatCompact(sales)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {datesWithReports.size > 0 && (
            <div style={{
              ...S.mono, marginTop: '16px', fontSize: '10px',
              color: C.textDim, display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{
                height: '8px', width: '8px', borderRadius: '50%',
                backgroundColor: C.accent, boxShadow: `0 0 8px ${C.accent}`,
              }} />
              <span>저장된 보고서 있음 · 클릭해서 상세 보기</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
