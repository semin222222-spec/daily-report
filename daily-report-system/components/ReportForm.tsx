'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  DailyReport, StoreName, ISSUE_TYPES,
  emptyReport, saveReport, getReport,
} from '@/lib/supabase';
import { C, S, formatNumInput, parseNumInput, formatKRW } from '@/lib/theme';

export default function ReportForm() {
  const { profile } = useAuth();
  const myStore = profile?.store_name as StoreName | undefined;

  const [form, setForm] = useState<DailyReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ store: string; date: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myStore) return;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      try {
        const existing = await getReport(myStore, today);
        setForm(existing || emptyReport(myStore));
      } catch (e) {
        setForm(emptyReport(myStore));
      } finally {
        setLoading(false);
      }
    })();
  }, [myStore]);

  if (loading || !form || !myStore) {
    return <div style={{ padding: '60px', textAlign: 'center', color: C.textDim }}>로딩 중...</div>;
  }

  const update = <K extends keyof DailyReport>(k: K, v: DailyReport[K]) =>
    setForm((p) => (p ? { ...p, [k]: v } : p));

  const toggleIssue = (key: string) =>
    setForm((p) => p ? {
      ...p,
      issues: p.issues.includes(key) ? p.issues.filter((i) => i !== key) : [...p.issues, key],
    } : p);

  const paymentSum = form.card_amount + form.cash_amount + form.other_amount - form.discount_amount;
  const salesMatch = Math.abs(paymentSum - form.total_sales) < 1000;

  const checkItems = [
    { key: 'check_kitchen' as const, label: '주방' },
    { key: 'check_hall' as const, label: '홀' },
    { key: 'check_trash' as const, label: '쓰레기' },
    { key: 'check_gas' as const, label: '가스' },
    { key: 'check_electric' as const, label: '전기' },
  ];
  const checkedCount = checkItems.filter((i) => form[i.key]).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveReport(form);
      setSavedInfo({ store: form.store_name, date: form.report_date });
    } catch (err: any) {
      alert(`저장 실패: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '768px', margin: '0 auto', padding: '24px 16px 100px' }}>
      <header style={{
        marginBottom: '32px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: '12px',
        borderBottom: `1px solid ${C.border}`, paddingBottom: '24px',
      }}>
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          <div style={{ ...S.mono, marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', color: C.accent }}>
            Daily Closing Report
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(26px, 7vw, 36px)', fontWeight: 600, letterSpacing: '-0.02em', color: C.text, lineHeight: 1.15 }}>
            마감 보고서
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
            <span>{profile?.display_name || profile?.user_id}</span>
          </div>
        </div>
        <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
          <div style={{ ...S.mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textFaint }}>
            Report Date
          </div>
          <input
            type="date"
            value={form.report_date}
            onChange={(e) => update('report_date', e.target.value)}
            style={{ ...S.mono, marginTop: '4px', fontSize: '16px', color: C.text, backgroundColor: 'transparent', border: 'none', outline: 'none', textAlign: 'right', cursor: 'pointer' }}
          />
        </div>
      </header>

      <Section no="01" title="매출 정보" subtitle="Sales">
        <div style={{ ...S.card, marginBottom: '16px', padding: '18px' }}>
          <label style={S.label}>Total Sales · 총 매출</label>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumInput(form.total_sales)}
              onChange={(e) => update('total_sales', parseNumInput(e.target.value))}
              style={{ ...S.mono, width: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', color: C.accent, fontSize: '36px', fontWeight: 600 }}
              placeholder="0"
            />
            <span style={{ fontSize: '18px', color: C.textDim }}>원</span>
          </div>
          <div style={{ ...S.mono, marginTop: '10px', fontSize: '12px', color: salesMatch ? C.success : C.warning }}>
            {salesMatch
              ? '✓ 결제수단 합계 일치'
              : `⚠ 합계와 ${formatKRW(Math.abs(paymentSum - form.total_sales))} 차이`}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          <MiniNumField label="카드" value={form.card_amount} onChange={(v) => update('card_amount', v)} />
          <MiniNumField label="현금" value={form.cash_amount} onChange={(v) => update('cash_amount', v)} />
          <MiniNumField label="기타" value={form.other_amount} onChange={(v) => update('other_amount', v)} />
          <MiniNumField label="할인" value={form.discount_amount} onChange={(v) => update('discount_amount', v)} minus />
          <MiniNumField label="시재" value={form.cash_on_hand} onChange={(v) => update('cash_on_hand', v)} />
        </div>
      </Section>

      <Section no="02" title="재고 / 점검" subtitle="Inventory">
        <Field label="부족 재고">
          <textarea
            rows={2}
            value={form.low_stock}
            onChange={(e) => update('low_stock', e.target.value)}
            placeholder="소주 2박스, 김치 소진 임박..."
            style={{ ...S.input, fontFamily: "'EB Garamond', Georgia, serif", resize: 'vertical' }}
          />
        </Field>
        <Field label="발주 필요">
          <textarea
            rows={2}
            value={form.order_needed}
            onChange={(e) => update('order_needed', e.target.value)}
            placeholder="삼겹살 20kg, 맥주 10박스..."
            style={{ ...S.input, fontFamily: "'EB Garamond', Georgia, serif", resize: 'vertical' }}
          />
        </Field>
      </Section>

      <Section no="03" title="위생 / 시설" subtitle="Facility" counter={`${checkedCount}/5`}>
        <div style={{ display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
          {checkItems.map((item) => {
            const on = form[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => update(item.key, !on)}
                style={{
                  borderRadius: '10px',
                  border: `1px solid ${on ? C.accent : C.border}`,
                  backgroundColor: on ? 'rgba(160, 124, 44, 0.08)' : C.bgCard,
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  minHeight: '70px',
                }}
              >
                <div style={{
                  marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '22px', width: '22px', borderRadius: '50%',
                  border: `1px solid ${on ? C.accent : C.textFaint}`,
                  backgroundColor: on ? C.accent : 'transparent',
                  color: on ? '#ffffff' : C.textFaint, fontSize: '11px',
                }}>
                  {on ? '✓' : '○'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: on ? C.text : C.textDim }}>
                  {item.label}
                </div>
                <div style={{ ...S.mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: on ? C.accent : C.textFaint }}>
                  {on ? 'OK' : 'Pending'}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section no="04" title="인원 / 특이사항" subtitle="Staff">
        <Field label="근무 인원">
          <div style={{ ...S.card, padding: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <StaffCounter label="직원" value={form.staff_fulltime} onChange={(v) => update('staff_fulltime', v)} />
              <StaffCounter label="파트타이머" value={form.staff_parttime} onChange={(v) => update('staff_parttime', v)} />
            </div>
            <div style={{
              marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: `1px solid ${C.border}`, paddingTop: '12px',
            }}>
              <span style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
                Total · 총
              </span>
              <span style={{ ...S.mono, fontSize: '18px', fontWeight: 600, color: C.accent }}>
                {form.staff_fulltime + form.staff_parttime}
                <span style={{ marginLeft: '4px', fontSize: '13px', color: C.textDim }}>명</span>
              </span>
            </div>
          </div>
        </Field>

        <Field label="지각 / 결근">
          <textarea
            rows={2}
            value={form.attendance_issue}
            onChange={(e) => update('attendance_issue', e.target.value)}
            style={{ ...S.input, fontFamily: "'EB Garamond', Georgia, serif", resize: 'vertical' }}
          />
        </Field>
        <Field label="컴플레인">
          <textarea
            rows={2}
            value={form.complaint}
            onChange={(e) => update('complaint', e.target.value)}
            placeholder="예: 테이블 4번 음식 늦게 나와 불만"
            style={{ ...S.input, fontFamily: "'EB Garamond', Georgia, serif", resize: 'vertical' }}
          />
        </Field>
        <Field label="총평">
          <textarea
            rows={3}
            value={form.summary}
            onChange={(e) => update('summary', e.target.value)}
            placeholder="오늘 영업 전반에 대한 소감..."
            style={{ ...S.input, fontFamily: "'EB Garamond', Georgia, serif", resize: 'vertical' }}
          />
        </Field>

        <div style={{ ...S.card, marginTop: '16px', padding: '16px' }}>
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.danger }}>
                Priority Issues
              </div>
              <div style={{ marginTop: '2px', fontSize: '14px', fontWeight: 600, color: C.text }}>
                주요 이슈{' '}
                <span style={{ fontWeight: 400, fontSize: '11px', color: C.textDim }}>(중복 가능)</span>
              </div>
            </div>
            {form.issues.length > 0 && (
              <span style={{
                ...S.mono, borderRadius: '9999px', padding: '4px 10px',
                fontSize: '11px', fontWeight: 700,
                backgroundColor: C.danger, color: '#fff',
                whiteSpace: 'nowrap',
              }}>
                {form.issues.length}건
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
            {ISSUE_TYPES.map((issue) => {
              const selected = form.issues.includes(issue.key);
              return (
                <button
                  key={issue.key}
                  type="button"
                  onClick={() => toggleIssue(issue.key)}
                  style={{
                    position: 'relative', borderRadius: '8px',
                    border: `2px solid ${selected ? C.dangerBright : C.border}`,
                    backgroundColor: selected ? C.danger : C.bgCard,
                    padding: '10px', textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: selected ? '0 6px 16px -4px rgba(239, 68, 68, 0.4)' : 'none',
                    minHeight: '64px',
                  }}
                >
                  <div style={{ fontSize: '18px' }}>{issue.icon}</div>
                  <div style={{
                    marginTop: '4px', fontSize: '11px', fontWeight: 700,
                    color: selected ? '#ffffff' : C.textDim,
                  }}>
                    {issue.label}
                  </div>
                  {selected && (
                    <div style={{
                      position: 'absolute', right: '6px', top: '6px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: '18px', width: '18px', borderRadius: '50%',
                      backgroundColor: '#ffffff', color: C.danger,
                      fontSize: '10px', fontWeight: 700,
                    }}>✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section no="05" title="고객 통계" subtitle="Customers">
        <div style={{ ...S.card, padding: '16px' }}>
          <div style={{ ...S.mono, marginBottom: '10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
            Total Teams · 총 팀
          </div>
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <input
              type="number"
              value={form.total_teams || ''}
              onChange={(e) => update('total_teams', Number(e.target.value) || 0)}
              style={{ ...S.mono, width: '80px', backgroundColor: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: '30px', fontWeight: 600 }}
            />
            <span style={{ color: C.textDim, fontSize: '14px' }}>팀</span>
          </div>

          <div style={{
            display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: `1px solid ${C.border}`, paddingTop: '12px',
          }}>
            <TinyField label="🇰🇷 한국" value={form.customer_korean} onChange={(v) => update('customer_korean', v)} />
            <TinyField label="🇨🇳 중국" value={form.foreigner_chinese} onChange={(v) => update('foreigner_chinese', v)} />
            <TinyField label="🇯🇵 일본" value={form.foreigner_japanese} onChange={(v) => update('foreigner_japanese', v)} />
            <TinyField label="🌏 기타" value={form.foreigner_other} onChange={(v) => update('foreigner_other', v)} />
          </div>
        </div>

        <div style={{ marginTop: '8px', display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' }}>
          <MiniNumField label="예약" value={form.reservation_count} onChange={(v) => update('reservation_count', v)} unit="건" />
          <MiniNumField label="웨이팅" value={form.waiting_count} onChange={(v) => update('waiting_count', v)} unit="팀" />
        </div>
      </Section>

      <div style={{ position: 'sticky', bottom: '16px', marginTop: '32px', zIndex: 10 }}>
        {savedInfo ? (
          <div style={{
            borderRadius: '12px', border: `1px solid ${C.success}`,
            backgroundColor: 'rgba(90, 122, 62, 0.95)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                ✓ 저장 완료
              </div>
              <div style={{ ...S.mono, marginTop: '2px', fontSize: '11px', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {savedInfo.store} · {savedInfo.date}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSavedInfo(null)}
              style={{
                borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)',
                backgroundColor: 'transparent', color: '#ffffff',
                padding: '8px 12px', fontSize: '12px', cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              계속 수정
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              backgroundColor: C.accent, color: '#ffffff',
              fontWeight: 600, fontSize: '15px', cursor: saving ? 'wait' : 'pointer',
              boxShadow: '0 12px 28px -8px rgba(160, 124, 44, 0.45)',
              opacity: saving ? 0.6 : 1,
              minHeight: '52px',
            }}
          >
            {saving ? '저장 중...' : '마감 보고 저장 ↵'}
          </button>
        )}
      </div>
    </form>
  );
}

function Section({ no, title, subtitle, counter, children }: {
  no: string; title: string; subtitle: string; counter?: string; children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ ...S.mono, fontSize: '11px', color: C.accent }}>{no}</span>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: C.text }}>{title}</h2>
          <span style={{ ...S.mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textFaint }}>
            {subtitle}
          </span>
        </div>
        {counter && <span style={{ ...S.mono, fontSize: '11px', color: C.accent }}>{counter}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={S.label}>{label}</span>
      {children}
    </label>
  );
}

function MiniNumField({ label, value, onChange, minus, unit = '원' }: {
  label: string; value: number; onChange: (v: number) => void; minus?: boolean; unit?: string;
}) {
  const useCommas = unit === '원';
  return (
    <label style={{ display: 'block', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, padding: '10px 12px' }}>
      <span style={{ ...S.mono, marginBottom: '4px', display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.textDim }}>
        {minus && <span style={{ color: C.warning }}>− </span>}{label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <input
          type="text"
          inputMode="numeric"
          value={useCommas ? formatNumInput(value) : (value === 0 ? '' : value)}
          onChange={(e) => onChange(useCommas ? parseNumInput(e.target.value) : (Number(e.target.value.replace(/[^0-9]/g, '')) || 0))}
          style={{ ...S.mono, width: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '16px', fontWeight: 600, color: C.text, minWidth: 0 }}
          placeholder="0"
        />
        <span style={{ fontSize: '11px', color: C.textFaint, flexShrink: 0 }}>{unit}</span>
      </div>
    </label>
  );
}

function TinyField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '4px', fontSize: '11px', color: C.textDim, whiteSpace: 'nowrap' }}>{label}</div>
      <input
        type="number"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{ ...S.mono, width: '100%', borderRadius: '4px', backgroundColor: C.bgDeep, border: `1px solid ${C.border}`, padding: '6px', textAlign: 'center', fontSize: '16px', color: C.text, outline: 'none', minWidth: 0 }}
        placeholder="0"
      />
    </div>
  );
}

function StaffCounter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ borderRadius: '8px', backgroundColor: C.bgDeep, padding: '12px' }}>
      <div style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 600, color: C.text, textAlign: 'center' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          style={{ height: '36px', width: '36px', flexShrink: 0, borderRadius: '6px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, color: C.textDim, fontSize: '18px', cursor: 'pointer' }}
        >−</button>
        <div style={{ ...S.mono, flex: 1, textAlign: 'center', fontSize: '20px', fontWeight: 600, color: C.text, minWidth: 0 }}>
          {value}
          <span style={{ marginLeft: '2px', fontSize: '11px', color: C.textDim }}>명</span>
        </div>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          style={{ height: '36px', width: '36px', flexShrink: 0, borderRadius: '6px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, color: C.textDim, fontSize: '18px', cursor: 'pointer' }}
        >+</button>
      </div>
    </div>
  );
}