'use client';

import { useEffect, useState } from 'react';
import { STORES, getMonthComparison } from '@/lib/supabase';
import { C, S, formatKRW, formatCompact } from '@/lib/theme';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

// 매장명 축약 (차트 라벨용)
const shortName = (name: string) => {
  if (name.startsWith('삐딱 ')) return name.replace('삐딱 ', '');
  return name;
};

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
    store: shortName(store),
    fullName: store,
    이번달: data.current.byStore[store] || 0,
    전월: data.previous.byStore[store] || 0,
  }));

  const totalDiff = data.current.total - data.previous.total;
  const diffPct = data.previous.total > 0 ? (totalDiff / data.previous.total) * 100 : 0;

  return (
    <div style={{ ...S.card, padding: '16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.accent }}>
          Month-over-Month
        </div>
        <h2 style={{ margin: '4px 0 12px', fontSize: '18px', fontWeight: 600, color: C.text }}>
          전월 대비 매장별 비교
        </h2>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap',
          padding: '10px 14px', borderRadius: '10px',
          backgroundColor: totalDiff >= 0 ? 'rgba(90, 122, 62, 0.08)' : 'rgba(184, 92, 44, 0.08)',
        }}>
          <span style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
            전체 증감
          </span>
          <span style={{ ...S.mono, fontSize: '18px', fontWeight: 700, color: totalDiff >= 0 ? C.success : C.warning }}>
            {totalDiff >= 0 ? '+' : ''}{formatCompact(totalDiff)}원
          </span>
          <span style={{ ...S.mono, fontSize: '12px', color: totalDiff >= 0 ? C.success : C.warning }}>
            ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      <div style={{ height: '220px', width: '100%', marginBottom: '20px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 0, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis
              dataKey="store"
              fontSize={10}
              stroke={C.textDim}
              axisLine={false}
              tickLine={false}
              angle={-30}
              textAnchor="end"
              interval={0}
              height={50}
            />
            <YAxis
              fontSize={9}
              stroke={C.textDim}
              tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: C.bgCard,
                border: `1px solid ${C.accent}`,
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
              }}
              formatter={(v: number) => formatKRW(v)}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: C.textDim }} />
            <Bar dataKey="전월" fill={C.textFaint} radius={[4, 4, 0, 0]} />
            <Bar dataKey="이번달" fill={C.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 모바일 친화적 카드 리스트 (표 대신) */}
      <div style={{
        ...S.mono, fontSize: '10px', textTransform: 'uppercase',
        letterSpacing: '0.15em', color: C.textDim, marginBottom: '8px',
      }}>
        Store Breakdown
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {chartData.map((row) => {
          const diff = row.이번달 - row.전월;
          const pct = row.전월 > 0 ? (diff / row.전월) * 100 : 0;
          const positive = diff >= 0;
          return (
            <div
              key={row.fullName}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: `1px solid ${C.border}`,
                backgroundColor: C.bgCard,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '6px', gap: '8px',
              }}>
                <span style={{
                  fontSize: '14px', fontWeight: 600, color: C.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  flex: '1 1 auto', minWidth: 0,
                }}>
                  {row.fullName}
                </span>
                <span style={{
                  ...S.mono, fontSize: '12px', fontWeight: 700,
                  color: positive ? C.success : C.warning,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {positive ? '+' : ''}{formatCompact(diff)}원
                </span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                ...S.mono, fontSize: '11px', color: C.textDim,
              }}>
                <span>전월 {formatCompact(row.전월)} → 이번달 {formatCompact(row.이번달)}</span>
                <span style={{ color: positive ? C.success : C.warning }}>
                  {positive ? '+' : ''}{pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}