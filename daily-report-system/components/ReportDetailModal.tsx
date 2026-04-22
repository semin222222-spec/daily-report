'use client';

import { useEffect, useState } from 'react';
import { DailyReport, ISSUE_LABEL, ISSUE_ICON, getReportsByDate } from '@/lib/supabase';
import { C, S, formatKRW } from '@/lib/theme';

export default function ReportDetailModal({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStore, setActiveStore] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getReportsByDate(date)
      .then((data) => {
        setReports(data);
        setActiveStore(data[0]?.store_name || null);
      })
      .finally(() => setLoading(false));
  }, [date]);

  const active = reports.find((r) => r.store_name === activeStore) || reports[0];

  const checkItems = [
    { key: 'check_kitchen' as const, label: '주방' },
    { key: 'check_hall' as const, label: '홀' },
    { key: 'check_trash' as const, label: '쓰레기' },
    { key: 'check_gas' as const, label: '가스' },
    { key: 'check_electric' as const, label: '전기' },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px', width: '100%', maxHeight: '90vh', overflow: 'auto',
          borderRadius: '16px', border: `1px solid ${C.border}`,
          backgroundColor: C.bgCard, padding: '24px',
        }}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px', paddingBottom: '16px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', color: C.accent }}>
              Report Detail
            </div>
            <div style={{ ...S.mono, fontSize: '22px', fontWeight: 600, color: C.text, marginTop: '2px' }}>
              {date}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              height: '36px', width: '36px', borderRadius: '50%',
              border: `1px solid ${C.border}`, backgroundColor: 'transparent',
              color: C.textDim, fontSize: '18px', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {loading && <div style={{ padding: '40px', textAlign: 'center', color: C.textDim }}>로딩 중...</div>}

        {!loading && reports.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textDim }}>
            이 날짜에 저장된 보고서가 없습니다.
          </div>
        )}

        {!loading && active && (
          <>
            {/* 매장 탭 */}
            {reports.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {reports.map((r) => {
                  const isActive = r.store_name === active.store_name;
                  const hasIssues = r.issues && r.issues.length > 0;
                  return (
                    <button
                      key={r.store_name}
                      onClick={() => setActiveStore(r.store_name)}
                      style={{
                        padding: '6px 14px', borderRadius: '9999px',
                        border: `1px solid ${isActive ? C.accent : hasIssues ? C.danger : C.border}`,
                        backgroundColor: isActive ? C.accent : C.bgCard,
                        color: isActive ? C.bg : hasIssues ? C.danger : C.textDim,
                        fontSize: '12px', fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {r.store_name}
                      {hasIssues && ` · ${r.issues.length}`}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 매출 요약 */}
            <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '12px', backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
              <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim, marginBottom: '4px' }}>
                Total Sales · {active.store_name}
              </div>
              <div style={{ ...S.mono, fontSize: '36px', fontWeight: 600, color: C.accent }}>
                {formatKRW(Number(active.total_sales))}
              </div>
              <div style={{
                marginTop: '16px', display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '12px', paddingTop: '16px', borderTop: `1px solid ${C.border}`,
              }}>
                <Stat label="카드" value={formatKRW(Number(active.card_amount))} />
                <Stat label="현금" value={formatKRW(Number(active.cash_amount))} />
                <Stat label="기타" value={formatKRW(Number(active.other_amount))} />
                <Stat label="할인" value={`-${formatKRW(Number(active.discount_amount))}`} warning />
                <Stat label="시재" value={formatKRW(Number(active.cash_on_hand))} />
              </div>
            </div>

            {/* 이슈 */}
            {active.issues && active.issues.length > 0 && (
              <Block title="주요 이슈" danger>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {active.issues.map((key) => (
                    <span key={key} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '9999px',
                      backgroundColor: C.danger, color: '#fff',
                      fontSize: '13px', fontWeight: 700,
                    }}>
                      <span>{ISSUE_ICON[key]}</span>
                      <span>{ISSUE_LABEL[key]}</span>
                    </span>
                  ))}
                </div>
              </Block>
            )}

            {/* 위생 */}
            <Block title="위생 / 시설 점검">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '6px' }}>
                {checkItems.map((i) => {
                  const on = active[i.key];
                  return (
                    <div
                      key={i.key}
                      style={{
                        padding: '8px', borderRadius: '6px', textAlign: 'center',
                        backgroundColor: on ? 'rgba(107, 142, 78, 0.15)' : 'rgba(201, 115, 78, 0.15)',
                        color: on ? C.success : C.warning,
                        fontSize: '12px', fontWeight: 600,
                      }}
                    >
                      {on ? '✓' : '✗'} {i.label}
                    </div>
                  );
                })}
              </div>
            </Block>

            {/* 인원 / 고객 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                <div style={{ ...S.mono, fontSize: '10px', color: C.textDim, marginBottom: '8px' }}>STAFF · 근무</div>
                <div style={{ fontSize: '14px', color: C.text }}>
                  직원 <strong>{active.staff_fulltime}</strong> · 파트 <strong>{active.staff_parttime}</strong>
                </div>
                <div style={{ ...S.mono, marginTop: '4px', fontSize: '12px', color: C.accent }}>
                  총 {active.staff_fulltime + active.staff_parttime}명
                </div>
              </div>
              <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                <div style={{ ...S.mono, fontSize: '10px', color: C.textDim, marginBottom: '8px' }}>CUSTOMERS · 고객</div>
                <div style={{ fontSize: '14px', color: C.text }}>총 <strong>{active.total_teams}</strong>팀</div>
                <div style={{ ...S.mono, marginTop: '4px', fontSize: '11px', color: C.textDim }}>
                  🇰🇷{active.customer_korean} · 🇨🇳{active.foreigner_chinese} · 🇯🇵{active.foreigner_japanese} · 🌏{active.foreigner_other}
                </div>
              </div>
            </div>

            {/* 텍스트 필드들 */}
            {active.low_stock && <Block title="부족 재고"><TextBox text={active.low_stock} /></Block>}
            {active.order_needed && <Block title="발주 필요"><TextBox text={active.order_needed} /></Block>}
            {active.attendance_issue && <Block title="지각 / 결근"><TextBox text={active.attendance_issue} /></Block>}
            {active.complaint && <Block title="컴플레인 내용"><TextBox text={active.complaint} /></Block>}
            {active.summary && <Block title="총평"><TextBox text={active.summary} /></Block>}
          </>
        )}
      </div>
    </div>
  );
}

function Block({ title, danger, children }: { title: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em',
        color: danger ? C.danger : C.textDim, marginBottom: '8px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div>
      <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', color: C.textDim }}>{label}</div>
      <div style={{ ...S.mono, fontSize: '14px', fontWeight: 600, color: warning ? C.warning : C.text, marginTop: '2px' }}>
        {value}
      </div>
    </div>
  );
}

function TextBox({ text }: { text: string }) {
  return (
    <div style={{
      padding: '12px', borderRadius: '8px',
      backgroundColor: C.bg, border: `1px solid ${C.border}`,
      fontSize: '14px', color: C.text, lineHeight: 1.6,
      whiteSpace: 'pre-wrap',
    }}>
      {text}
    </div>
  );
}
