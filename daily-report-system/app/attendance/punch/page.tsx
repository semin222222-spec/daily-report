'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RequireRole from '@/components/RequireRole';
import { useAuth } from '@/lib/auth';
import { C, S } from '@/lib/theme';
import {
  STORES,
  StoreName,
  Staff,
  AttendanceRecord,
  listStaff,
  getOpenRecords,
  getTodayRecords,
  checkIn,
  checkOut,
  kstTimeStr,
} from '@/lib/attendance';

export default function PunchPage() {
  return (
    <RequireRole allow={['owner', 'manager']}>
      <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: C.textDim }}>로딩 중...</div>}>
        <PunchInner />
      </Suspense>
    </RequireRole>
  );
}

function PunchInner() {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'owner';
  const myStore = profile?.store_name as StoreName | undefined;
  const searchParams = useSearchParams();
  const paramStore = searchParams.get('store') as StoreName | null;

  // 대상 매장 결정: manager=자기 매장 / owner=URL파라미터 또는 선택
  const [pickedStore, setPickedStore] = useState<StoreName | null>(
    isOwner ? (paramStore && STORES.includes(paramStore) ? paramStore : null) : (myStore as StoreName)
  );

  if (isOwner && !pickedStore) {
    return <StorePicker onPick={setPickedStore} />;
  }
  if (!pickedStore) {
    return <div style={{ padding: '60px', textAlign: 'center', color: C.textDim }}>매장 정보를 불러올 수 없습니다.</div>;
  }
  return <PunchBoard store={pickedStore} onChangeStore={isOwner ? () => setPickedStore(null) : undefined} />;
}

function StorePicker({ onPick }: { onPick: (s: StoreName) => void }) {
  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', color: C.accent, marginBottom: '8px' }}>
        Punch
      </div>
      <h1 style={{ margin: '0 0 24px', fontSize: '28px', fontWeight: 600 }}>매장 선택</h1>
      <div style={{ display: 'grid', gap: '10px' }}>
        {STORES.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            style={{
              padding: '18px', borderRadius: '12px',
              border: `1px solid ${C.border}`, backgroundColor: C.bgCard,
              color: C.text, fontSize: '18px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function PunchBoard({ store, onChangeStore }: { store: StoreName; onChangeStore?: () => void }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [openRecords, setOpenRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);     // 처리 중인 staff id
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [pending, setPending] = useState<{ staff: Staff; type: 'in' | 'out'; record?: AttendanceRecord } | null>(null);
  const [clock, setClock] = useState(() => kstNow());

  useEffect(() => {
    const t = setInterval(() => setClock(kstNow()), 20000);
    return () => clearInterval(t);
  }, []);

  const reload = () => {
    setLoading(true);
    Promise.all([listStaff(store), getOpenRecords(store), getTodayRecords(store)])
      .then(([s, or, tr]) => { setStaff(s); setOpenRecords(or); setTodayRecords(tr); })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };
  useEffect(reload, [store]);

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

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2200);
  };

  const onTileTap = (st: Staff) => {
    const open = openByStaff[st.id];
    const today = todayByStaff[st.id];
    if (open) {
      setPending({ staff: st, type: 'out', record: open });
    } else if (today && today.check_out_at) {
      showToast(`${st.name}님은 오늘 이미 퇴근했어요.`, false);
    } else {
      setPending({ staff: st, type: 'in' });
    }
  };

  const confirmAction = async () => {
    if (!pending) return;
    const { staff: st, type, record } = pending;
    setBusy(st.id);
    setPending(null);
    try {
      if (type === 'in') {
        await checkIn(st);
        showToast(`${st.name}님 출근! 화이팅 💪`);
      } else if (record) {
        await checkOut(record.id);
        showToast(`${st.name}님 퇴근! 수고하셨습니다 🙌`);
      }
      reload();
    } catch (e) {
      console.error(e);
      showToast('처리에 실패했습니다. 다시 시도해주세요.', false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '20px 14px 80px' }}>
      {/* 헤더 */}
      <header style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.25em', color: C.accent }}>
            Punch · 출퇴근
          </div>
          <h1 style={{ margin: '2px 0 0', fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 600 }}>{store}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...S.mono, fontSize: '28px', fontWeight: 600, color: C.text }}>{clock.time}</div>
          <div style={{ ...S.mono, fontSize: '11px', color: C.textDim }}>{clock.date}</div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <Link href="/attendance" style={{
          fontSize: '12px', color: C.textDim, border: `1px solid ${C.border}`,
          padding: '6px 12px', borderRadius: '8px',
        }}>← 근태 관리</Link>
        {onChangeStore && (
          <button onClick={onChangeStore} style={{
            fontSize: '12px', color: C.textDim, border: `1px solid ${C.border}`,
            backgroundColor: 'transparent', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
          }}>매장 변경</button>
        )}
      </div>

      {loading && <div style={{ padding: '40px', textAlign: 'center', color: C.textDim }}>로딩 중...</div>}

      {!loading && staff.length === 0 && (
        <div style={{ ...S.card, padding: '40px 20px', textAlign: 'center', color: C.textDim }}>
          등록된 알바가 없습니다.<br />
          <Link href="/attendance" style={{ color: C.accent, fontWeight: 600 }}>근태 관리</Link>에서 먼저 추가하세요.
        </div>
      )}

      {!loading && staff.length > 0 && (
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {staff.map((st) => {
            const open = openByStaff[st.id];
            const today = todayByStaff[st.id];
            const done = !open && today && today.check_out_at;
            const isBusy = busy === st.id;

            let bg = C.bgCard, border = C.border, badge = '출근하기', badgeColor = C.accent, statusLine = '미출근';
            if (open) {
              bg = 'linear-gradient(135deg, rgba(160,124,44,0.16), rgba(160,124,44,0.04))';
              border = C.accent;
              badge = '퇴근하기';
              badgeColor = C.accent;
              statusLine = `${kstTimeStr(open.check_in_at)} 출근 · 근무중`;
            } else if (done) {
              bg = C.bg;
              border = C.border;
              badge = '퇴근 완료';
              badgeColor = C.success;
              statusLine = `${kstTimeStr(today!.check_in_at)}~${kstTimeStr(today!.check_out_at!)}`;
            }

            return (
              <button
                key={st.id}
                onClick={() => onTileTap(st)}
                disabled={isBusy}
                style={{
                  position: 'relative',
                  textAlign: 'left', cursor: done ? 'default' : 'pointer',
                  padding: '18px 16px', borderRadius: '16px',
                  border: `2px solid ${border}`, background: bg,
                  minHeight: '128px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  gap: '10px', opacity: isBusy ? 0.5 : 1,
                }}
              >
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: C.text }}>{st.name}</div>
                  <div style={{ ...S.mono, fontSize: '11px', color: open ? C.accent : C.textDim, marginTop: '4px' }}>
                    {statusLine}
                  </div>
                </div>
                <div style={{
                  ...S.mono, alignSelf: 'flex-start',
                  fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em',
                  color: done ? badgeColor : C.bg,
                  backgroundColor: done ? 'transparent' : badgeColor,
                  border: done ? `1px solid ${C.border}` : 'none',
                  padding: done ? '5px 10px' : '6px 12px', borderRadius: '8px',
                }}>
                  {done ? '✓ ' : ''}{badge}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 확인 오버레이 */}
      {pending && (
        <div
          onClick={() => setPending(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            maxWidth: '380px', width: '100%', borderRadius: '20px',
            border: `1px solid ${C.border}`, backgroundColor: C.bgCard, padding: '28px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '26px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>
              {pending.staff.name}
            </div>
            <div style={{ fontSize: '16px', color: C.textDim, marginBottom: '24px' }}>
              {pending.type === 'in' ? '출근 처리할까요?' : '퇴근 처리할까요?'}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPending(null)} style={{
                flex: 1, padding: '16px', borderRadius: '12px',
                border: `1px solid ${C.border}`, backgroundColor: 'transparent',
                color: C.textDim, fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              }}>취소</button>
              <button onClick={confirmAction} style={{
                flex: 2, padding: '16px', borderRadius: '12px', border: 'none',
                backgroundColor: C.accent, color: C.bg, fontSize: '16px', fontWeight: 700, cursor: 'pointer',
              }}>
                {pending.type === 'in' ? '출근' : '퇴근'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: '32px', transform: 'translateX(-50%)', zIndex: 120,
          padding: '14px 24px', borderRadius: '12px',
          backgroundColor: toast.ok ? C.success : C.danger, color: '#fff',
          fontSize: '15px', fontWeight: 600, boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
          maxWidth: '90vw', textAlign: 'center',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function kstNow() {
  const d = new Date();
  return {
    time: new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(d),
    date: new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' }).format(d),
  };
}
