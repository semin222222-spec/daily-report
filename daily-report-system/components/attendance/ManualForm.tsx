'use client';

import { useState } from 'react';
import { C, S } from '@/lib/theme';
import {
  AttendanceRecord,
  Staff,
  upsertManual,
  updateRecord,
  kstDateStr,
  kstTimeStr,
} from '@/lib/attendance';

// 출퇴근 기록 신규 등록 / 기존 기록 편집(날짜 포함) 폼.
//   - record 가 있으면 편집: id 기준 UPDATE(updateRecord). 날짜도 바꿀 수 있다.
//     다른 기록과 (staff_id, work_date) 가 겹치면 23505 → 친절한 메시지로 안내.
//   - record 가 없으면 신규: upsertManual(=staff_id+work_date upsert).
export default function ManualForm({
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
  const [date, setDate] = useState(record?.work_date ?? kstDateStr());
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
      if (record) {
        // 기존 기록 편집 (날짜 포함)
        await updateRecord(record.id, {
          work_date: date,
          check_in_time: inTime,
          check_out_time: outTime || null,
          note,
        });
      } else {
        // 신규
        await upsertManual({
          store_name: staff.store_name,
          staff_id: staff.id,
          work_date: date,
          check_in_time: inTime,
          check_out_time: outTime || null,
          note,
        });
      }
      onSaved();
    } catch (e) {
      console.error(e);
      const code = (e as { code?: string })?.code;
      if (code === '23505') {
        setError('그 날짜에 이미 다른 기록이 있습니다. 다른 날짜를 선택하세요.');
      } else {
        setError('저장에 실패했습니다.');
      }
      setSaving(false);
    }
  };

  const overnightHint = outTime && outTime <= inTime;
  const dateChanged = !!record && date !== record.work_date;

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
            onChange={(e) => setDate(e.target.value)}
          />
          {dateChanged && (
            <div style={{ ...S.mono, fontSize: '11px', color: C.warning, marginTop: '4px' }}>
              날짜 변경: {record!.work_date} → {date}
            </div>
          )}
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
