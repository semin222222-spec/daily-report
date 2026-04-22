'use client';

import { useEffect, useState } from 'react';
import { STORES, getMonthComparison } from '@/lib/supabase';
import { C, S, formatKRW, formatCompact } from '@/lib/theme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function MonthCompareChart({ year, month }: { year: number; month: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMonthComparison(year, month)
      .then(setData)
      .finally(() => setLoading(false));
  }, [year, month]);

  if (loading || !data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: C.textDim }}>로딩 중...</div>;
  }

  const chartData = STORES.map((store) => ({
    store,
    이번달: data.current.byStore[store] || 0,
    전월: data.previous.byStore[store] || 0,
  }));

  const totalDiff = data.current.total - data.previous.total;
  const diffPct = data.previous.total > 0 ? (totalDiff / data.previous.total) * 100 : 0;

  return (
    <div style={{ ...S.card, padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.accent }}>
            Month-over-Month
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 600, color: C.text }}>
            전월 대비 매장별 비교
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
            전체 증감
          </div>
          <div style={{ ...S.mono, fontSize: '20px', fontWeight: 700, color: totalDiff >= 0 ? C.success : C.warning }}>
            {totalDiff >= 0 ? '+' : ''}{formatKRW(totalDiff)}
          </div>
          <div style={{ ...S.mono, fontSize: '11px', color: totalDiff >= 0 ? C.success : C.warning }}>
            ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
          </div>
        </div>
      </div>

      <div style={{ height: '288px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="store" fontSize={12} stroke={C.textDim} axisLine={false} tickLine={false} />
            <YAxis
              fontSize={10}
              stroke={C.textDim}
              tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: C.bg,
                border: `1px solid ${C.accent}`,
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
              }}
              formatter={(v: number) => formatKRW(v)}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: C.textDim }} />
            <Bar dataKey="전월" fill={C.textFaint} radius={[4, 4, 0, 0]} />
            <Bar dataKey="이번달" fill={C.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '24px', overflow: 'hidden', borderRadius: '12px', border: `1px solid ${C.border}` }}>
        <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.bg }}>
              <Th>Store</Th>
              <Th right>전월</Th>
              <Th right>이번달</Th>
              <Th right>증감</Th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => {
              const diff = row.이번달 - row.전월;
              const pct = row.전월 > 0 ? (diff / row.전월) * 100 : 0;
              return (
                <tr key={row.store} style={{ borderBottom: i < chartData.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: C.text }}>{row.store}</td>
                  <td style={{ ...S.mono, padding: '12px 16px', textAlign: 'right', color: C.textDim }}>
                    {formatKRW(row.전월)}
                  </td>
                  <td style={{ ...S.mono, padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: C.text }}>
                    {formatKRW(row.이번달)}
                  </td>
                  <td style={{
                    ...S.mono, padding: '12px 16px', textAlign: 'right',
                    fontWeight: 600, color: diff >= 0 ? C.success : C.warning,
                  }}>
                    {diff >= 0 ? '+' : ''}{formatCompact(diff)}원
                    <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.7 }}>
                      ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{
      ...S.mono, padding: '12px 16px', textAlign: right ? 'right' : 'left',
      fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em',
      color: C.textDim, fontWeight: 400,
    }}>
      {children}
    </th>
  );
}
