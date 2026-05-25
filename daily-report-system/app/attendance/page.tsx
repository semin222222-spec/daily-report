'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RequireRole from '@/components/RequireRole';
import AddStaffModal from '@/components/attendance/AddStaffModal';
import StaffDetailModal from '@/components/attendance/StaffDetailModal';
import { useAuth } from '@/lib/auth';
import { C, S } from '@/lib/theme';
import {
  STORES,
  StoreName,
  Staff,
  AttendanceRecord,
  listStaff,
  getMonthRecords,
  getTodayRecords,
  getOpenRecords,
  summarizeByStaff,
  formatDuration,
  kstTimeStr,
} from '@/lib/attendance';

export default function AttendancePage() {
  return (
    <RequireRole allow={['owner', 'manager']}>
      <AttendanceInner />
    </RequireRole>
  );
}

function AttendanceInner() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';
  const myStore = profile?.store_name as StoreName | undefined;

  // owner는 매장 필터(전체/매장별), manager는 자기 매장 고정
  const [storeFilter, setStoreFilter] = useState<StoreName | 'ALL'>(
    isOwner ? 'ALL' : (myStore as StoreName)
  );
  const activeStore: StoreName | undefined =
    storeFilter === 'ALL' ? undefined : storeFilter;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [staff, setStaff] = useState<Staff[]>([]);
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [openRecords, setOpenRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [detailStaff, setDetailStaff] = useState<Staff | null>(null);

  const reload = () => {
    setLoading(true);
    Promise.all([
      listStaff(activeStore),
      getMonthRecords(year, month, activeStore),
      getTodayRecords(activeStore),
      getOpenRecords(activeStore),
    ])
      .then(([s, mr, tr, or]) => {
        setStaff(s);
        setMonthRecords(mr);
        setTodayRecords(tr);
        setOpenRecords(or);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [storeFilter, year, month]);

  const summary = useMemo(() => summarizeByStaff(monthRecords), [monthRecords]);

  // 월간 KPI
  const monthTotalHours = Object.values(summary).reduce((a, s) => a + s.totalHours, 0);
  const workingNow = openRecords.length;
  const activeStaffCount = staff.length;

  const openByStaff = useMemo(() => {
    const m: Record<string, AttendanceRecord> = {};
    for (const r of openRecords) m[r.staff_id] = r;
    return m;
  }, [openRecords]);
  const todayByStaff = useMemo(() => {
    const m: Record<string, AttendanceRecord> = {};
    for (const r of todayRecords) m[r.staff_id] = r;
    return m;
  }, [todayRecords]);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 14px 80px' }}>
      {/* 헤더 */}
      <header style={{ marginBottom: '20px', borderBottom: `1px solid ${C.border}`, paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...S.mono, marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', color: C.accent }}>
              Attendance
            </div>
            <h1 style={{ margin: 0, fontSize: 'clamp(26px, 7vw, 36px)', fontWeight: 600, letterSpacing: '-0.02em', color: C.text, lineHeight: 1.1 }}>
              근태 관리
            </h1>
          </div>
          <Link
            href={activeStore ? `/attendance/punch?store=${encodeURIComponent(activeStore)}` : '/attendance/punch'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '8px',
              backgroundColor: C.accent, color: C.bg, fontWeight: 600, fontSize: '14px',
              whiteSpace: 'nowrap',
            }}
          >
            ⏱ 출퇴근 화면
          </Link>
        </div>

        {/* owner 매장 필터 */}
        {isOwner && (
          <div className="scroll-x" style={{ marginTop: '16px', display: 'flex', gap: '6px', paddingBottom: '2px' }}>
            <FilterChip label="전체" active={storeFilter === 'ALL'} onClick={() => setStoreFilter('ALL')} />
            {STORES.map((s) => (
              <FilterChip key={s} label={s} active={storeFilter === s} onClick={() => setStoreFilter(s)} />
            ))}
          </div>
        )}
        {!isOwner && myStore && (
          <div style={{ marginTop: '12px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              borderRadius: '9999px', padding: '4px 10px',
              backgroundColor: 'rgba(160, 124, 44, 0.12)', color: C.accent, fontWeight: 600, fontSize: '13px',
            }}>
              <span style={{ height: '5px', width: '5px', borderRadius: '50%', backgroundColor: C.accent }} />
              {myStore}
            </span>
          </div>
        )}

        {/* 월 이동 */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={prevMonth} style={navBtn}>←</button>
          <div style={{ flex: 1, borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.bgCard, padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ ...S.mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>Period</div>
            <div style={{ ...S.mono, fontSize: '16px', color: C.text }}>{year}.{String(month).padStart(2, '0')}</div>
          </div>
          <button onClick={nextMonth} style={navBtn}>→</button>
        </div>
      </header>

      {/* 월간 KPI */}
      <div style={{ marginBottom: '24px', display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <KPICard label="이번달 총 근무" value={formatDuration(monthTotalHours)} accent />
        <KPICard label="활성 알바" value={`${activeStaffCount}명`} />
        <KPICard label="지금 근무중" value={`${workingNow}명`} highlight={workingNow > 0} />
      </div>

      {/* 오늘 근무 현황 */}
      <section style={{ ...S.card, padding: '16px', marginBottom: '20px' }}>
        <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.accent, marginBottom: '4px' }}>
          Today
        </div>
        <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600, color: C.text }}>오늘 근무 현황</h2>
        {loading && <div style={{ padding: '20px', textAlign: 'center', color: C.textDim }}>로딩 중...</div>}
        {!loading && staff.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: C.textDim, fontSize: '14px' }}>
            등록된 알바가 없습니다. 아래에서 추가하세요.
          </div>
        )}
        {!loading && staff.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {staff.map((st) => {
              const open = openByStaff[st.id];
              const today = todayByStaff[st.id];
              let statusText: string;
              let color = C.textFaint;
              if (open) {
                statusText = `근무중 · ${kstTimeStr(open.check_in_at)} 출근`;
                color = C.accent;
              } else if (today && today.check_out_at) {
                statusText = `퇴근 완료 · ${kstTimeStr(today.check_in_at)}~${kstTimeStr(today.check_out_at)}`;
                color = C.success;
              } else {
                statusText = '미출근';
              }
              return (
                <div key={st.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                  padding: '10px 12px', borderRadius: '8px',
                  border: `1px solid ${open ? C.accent : C.border}`,
                  backgroundColor: open ? 'rgba(160, 124, 44, 0.06)' : C.bg,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {open && <span style={{ height: '7px', width: '7px', borderRadius: '50%', backgroundColor: C.accent, flexShrink: 0 }} />}
                    <span style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>{st.name}</span>
                    {isOwner && (
                      <span style={{ ...S.mono, fontSize: '10px', color: C.textFaint }}>{st.store_name}</span>
                    )}
                  </div>
                  <span style={{ ...S.mono, fontSize: '12px', color, textAlign: 'right' }}>{statusText}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 알바 목록 (월간 누적) */}
      <section style={{ ...S.card, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.accent, marginBottom: '4px' }}>
              Staff · {year}.{String(month).padStart(2, '0')}
            </div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: C.text }}>알바 목록</h2>
          </div>
          {activeStore ? (
            <button
              onClick={() => setShowAdd(true)}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: `1px solid ${C.accent}`,
                backgroundColor: 'transparent', color: C.accent, fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}
            >
              ＋ 알바 추가
            </button>
          ) : (
            <span style={{ ...S.mono, fontSize: '11px', color: C.textFaint }}>
              매장을 선택하면 추가 가능
            </span>
          )}
        </div>

        {!loading && staff.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: C.textDim, fontSize: '14px' }}>
            알바가 없습니다.
          </div>
        )}

        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {staff.map((st) => {
            const sm = summary[st.id];
            const hours = sm?.totalHours ?? 0;
            const days = sm?.daysWorked ?? 0;
            return (
              <button
                key={st.id}
                onClick={() => setDetailStaff(st)}
                style={{
                  textAlign: 'left', cursor: 'pointer',
                  padding: '14px', borderRadius: '12px',
                  border: `1px solid ${C.border}`, backgroundColor: C.bg,
                  display: 'flex', flexDirection: 'column', gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: C.text }}>{st.name}</span>
                  <span style={{ color: C.textDim, fontSize: '13px' }}>→</span>
                </div>
                {isOwner && <span style={{ ...S.mono, fontSize: '10px', color: C.textFaint }}>{st.store_name}</span>}
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div>
                    <div style={{ ...S.mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.textDim }}>Hours</div>
                    <div style={{ ...S.mono, fontSize: '15px', fontWeight: 600, color: C.accent }}>{formatDuration(hours)}</div>
                  </div>
                  <div>
                    <div style={{ ...S.mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.textDim }}>Days</div>
                    <div style={{ ...S.mono, fontSize: '15px', fontWeight: 600, color: C.text }}>{days}일</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {showAdd && activeStore && (
        <AddStaffModal store={activeStore} onClose={() => setShowAdd(false)} onAdded={reload} />
      )}
      {detailStaff && (
        <StaffDetailModal
          staff={detailStaff}
          year={year}
          month={month}
          onClose={() => setDetailStaff(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  height: '40px', width: '40px', borderRadius: '8px',
  border: `1px solid ${C.border}`, backgroundColor: C.bgCard,
  color: C.textDim, cursor: 'pointer', fontSize: '18px',
};

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: '9999px', whiteSpace: 'nowrap',
        border: `1px solid ${active ? C.accent : C.border}`,
        backgroundColor: active ? C.accent : C.bgCard,
        color: active ? C.bg : C.textDim,
        fontSize: '12px', fontWeight: active ? 600 : 400, cursor: 'pointer', flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function KPICard({ label, value, accent, highlight }: { label: string; value: string; accent?: boolean; highlight?: boolean }) {
  const borderColor = highlight ? C.accent : accent ? C.accent : C.border;
  return (
    <div style={{
      borderRadius: '14px', border: `1px solid ${borderColor}`,
      background: accent || highlight ? `linear-gradient(135deg, rgba(160, 124, 44, 0.08), transparent)` : C.bgCard,
      padding: '14px 16px',
    }}>
      <div style={{ ...S.mono, marginBottom: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
        {label}
      </div>
      <div style={{ ...S.mono, fontSize: '20px', fontWeight: 600, color: accent || highlight ? C.accent : C.text, wordBreak: 'break-word' }}>
        {value}
      </div>
    </div>
  );
}
