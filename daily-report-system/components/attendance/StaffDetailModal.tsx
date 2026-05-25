'use client';

import { useEffect, useState } from 'react';
import { C, S } from '@/lib/theme';
import {
  AttendanceRecord,
  Staff,
  getStaffMonthRecords,
  upsertManual,
  deactivateStaff,
  hoursBetween,
  formatDuration,
  formatCheckOut,
  kstTimeStr,
} from '@/lib/attendance';

export default function StaffDetailModal({
  staff,
  year,
  month,
  onClose,
  onChanged,
}: {
  staff: Staff;
  year: number;
  month: number;
  onClose: () => void;
  onChanged: () => void;  // 기록/상태 변경 시 부모 새로고침
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // work_date 편집 중

  const load = () => {
    setLoading(true);
    getStaffMonthRecords(staff.id, year, month)
      .then(setRecords)
      .finally(() => setLoading(false));
  };
  useEffect(load, [staff.id, year, month]);

  const totalHours = records.reduce(
    (sum, r) => sum + (hoursBetween(r.check_in_at, r.check_out_at) ?? 0),
    0
  );

  const afterMutation = () => {
    load();
    onChanged();
  };

  const handleDeactivate = async () => {
    if (!confirm(`${staff.name} 알바를 비활성화할까요?\n(기록은 보존됩니다. 목록에서만 숨겨집니다.)`)) return;
    try {
      await deactivateStaff(staff.id);
      onChanged();
      onClose();
    } catch (e) {
      console.error(e);
      alert('비활성화에 실패했습니다.');
    }
  };

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
          maxWidth: '560px', width: '100%', maxHeight: '90vh', overflow: 'auto',
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
              Staff · {year}.{String(month).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: C.text, marginTop: '2px' }}>
              {staff.name}
            </div>
            <div style={{ ...S.mono, fontSize: '11px', color: C.textDim, marginTop: '4px' }}>
              {staff.store_name}
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

        {/* 월간 요약 */}
        <div style={{
          marginBottom: '20px', padding: '16px', borderRadius: '12px',
          backgroundColor: C.bg, border: `1px solid ${C.border}`,
          display: 'flex', gap: '24px',
        }}>
          <div>
            <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
              Total Hours
            </div>
            <div style={{ ...S.mono, fontSize: '22px', fontWeight: 600, color: C.accent }}>
              {formatDuration(totalHours)}
            </div>
          </div>
          <div>
            <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: C.textDim }}>
              Days
            </div>
            <div style={{ ...S.mono, fontSize: '22px', fontWeight: 600, color: C.text }}>
              {records.length}일
            </div>
          </div>
        </div>

        {/* 수동 추가 버튼 */}
        <button
          onClick={() => setEditing('__new__')}
          style={{
            width: '100%', marginBottom: '16px', padding: '10px',
            borderRadius: '8px', border: `1px dashed ${C.accent}`,
            backgroundColor: 'transparent', color: C.accent,
            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
          }}
        >
          ＋ 기록 수동 추가
        </button>

        {editing === '__new__' && (
          <ManualForm
            staff={staff}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); afterMutation(); }}
          />
        )}

        {/* 일별 기록 */}
        {loading && <div style={{ padding: '30px', textAlign: 'center', color: C.textDim }}>로딩 중...</div>}

        {!loading && records.length === 0 && (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: C.textDim, fontSize: '14px' }}>
            이번 달 기록이 없습니다.
          </div>
        )}

        {!loading && records.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {records.map((r) => {
              const h = hoursBetween(r.check_in_at, r.check_out_at);
              const open = r.check_out_at === null;
              const isEditing = editing === r.work_date;
              return (
                <div key={r.id}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '8px',
                      border: `1px solid ${open ? C.accent : C.border}`,
                      backgroundColor: open ? 'rgba(160, 124, 44, 0.06)' : C.bg,
                    }}
                  >
                    <div style={{ ...S.mono, fontSize: '12px', color: C.textDim, width: '46px', flexShrink: 0 }}>
                      {r.work_date.slice(5)}
                    </div>
                    <div style={{ ...S.mono, fontSize: '13px', color: C.text, flex: 1 }}>
                      {kstTimeStr(r.check_in_at)}
                      <span style={{ color: C.textFaint, margin: '0 4px' }}>→</span>
                      {formatCheckOut(r.check_in_at, r.check_out_at)}
                    </div>
                    <div style={{
                      ...S.mono, fontSize: '12px', fontWeight: 600,
                      color: open ? C.accent : C.text, flexShrink: 0,
                    }}>
                      {formatDuration(h)}
                    </div>
                    {(r.modified_by_admin || r.is_manual) && (
                      <span style={{
                        fontSize: '9px', fontWeight: 700, color: C.warning,
                        border: `1px solid ${C.warning}`, borderRadius: '4px',
                        padding: '1px 4px', flexShrink: 0,
                      }}>
                        수정
                      </span>
                    )}
                    <button
                      onClick={() => setEditing(isEditing ? null : r.work_date)}
                      style={{
                        border: `1px solid ${C.border}`, backgroundColor: 'transparent',
                        color: C.textDim, fontSize: '11px', padding: '4px 8px',
                        borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {isEditing ? '닫기' : '수정'}
                    </button>
                  </div>
                  {isEditing && (
                    <ManualForm
                      staff={staff}
                      record={r}
                      onCancel={() => setEditing(null)}
                      onSaved={() => { setEditing(null); afterMutation(); }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 비활성화 */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={handleDeactivate}
            style={{
              border: `1px solid ${C.danger}`, backgroundColor: 'transparent',
              color: C.danger, fontSize: '12px', padding: '8px 14px',
              borderRadius: '8px', cursor: 'pointer',
            }}
          >
            알바 비활성화 (기록 보존)
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 수동 입력/수정 폼 (신규 또는 기존 record 편집)
// ============================================
function ManualForm({
  staff,
  record,
  onCancel,
  onSaved,
}: {
  staff: Staff;
  record?: AttendanceRecord;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(record?.work_date ?? todayKst());
  const [inTime, setInTime] = useState(record ? kstTimeStr(record.check_in_at) : '18:00');
  const [outTime, setOutTime] = useState(
    record?.check_out_at ? kstTimeStr(record.check_out_at) : ''
  );
  const [note, setNote] = useState(record?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!date || !inTime) {
      setError('날짜와 출근시간은 필수입니다.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await upsertManual({
        store_name: staff.store_name,
        staff_id: staff.id,
        work_date: date,
        check_in_time: inTime,
        check_out_time: outTime || null,
        note,
      });
      onSaved();
    } catch (e) {
      console.error(e);
      setError('저장에 실패했습니다.');
      setSaving(false);
    }
  };

  const overnightHint = outTime && outTime <= inTime;

  return (
    <div style={{
      margin: '8px 0', padding: '14px', borderRadius: '10px',
      backgroundColor: C.bgDeep, border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
        <div>
          <label style={S.label}>날짜 (출근일)</label>
          <input
            style={S.input} type="date" value={date}
            disabled={!!record}  // 기존 기록은 날짜 고정(unique 키)
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={S.label}>출근</label>
            <input style={S.input} type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>퇴근 (빈칸=근무중)</label>
            <input style={S.input} type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} />
          </div>
        </div>
        {overnightHint && (
          <div style={{ ...S.mono, fontSize: '11px', color: C.warning }}>
            ⁺¹ 퇴근이 출근보다 일러 다음날(새벽 퇴근)로 저장됩니다.
          </div>
        )}
        <div>
          <label style={S.label}>메모 (선택)</label>
          <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 지각, 조퇴 사유" />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: '10px', color: C.danger, fontSize: '12px' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
            backgroundColor: C.accent, color: C.bg, fontWeight: 600,
            fontSize: '13px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '10px 16px', borderRadius: '8px',
            border: `1px solid ${C.border}`, backgroundColor: 'transparent',
            color: C.textDim, fontSize: '13px', cursor: 'pointer',
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}
