'use client';

import { useState } from 'react';
import { C, S } from '@/lib/theme';
import { addStaff, kstDateStr, StoreName } from '@/lib/attendance';

export default function AddStaffModal({
  store,
  onClose,
  onAdded,
}: {
  store: StoreName;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState('');
  const [hiredAt, setHiredAt] = useState(kstDateStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) {
      setError('이름을 입력하세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addStaff({ store_name: store, name, hired_at: hiredAt || null });
      onAdded();
      onClose();
    } catch (e) {
      console.error(e);
      setError('저장에 실패했습니다. 권한 또는 매장을 확인하세요.');
      setSaving(false);
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
          maxWidth: '420px', width: '100%',
          borderRadius: '16px', border: `1px solid ${C.border}`,
          backgroundColor: C.bgCard, padding: '24px',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px', paddingBottom: '16px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ ...S.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3em', color: C.accent }}>
              New Staff
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: C.text, marginTop: '2px' }}>
              알바 추가
            </div>
            <div style={{ ...S.mono, fontSize: '11px', color: C.textDim, marginTop: '4px' }}>
              {store}
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

        <div style={{ marginBottom: '16px' }}>
          <label style={S.label}>이름</label>
          <input
            style={S.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="알바 이름"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={S.label}>입사일 (선택)</label>
          <input
            style={S.input}
            type="date"
            value={hiredAt}
            onChange={(e) => setHiredAt(e.target.value)}
          />
        </div>

        {error && (
          <div style={{
            marginBottom: '16px', padding: '10px 12px', borderRadius: '8px',
            backgroundColor: 'rgba(220, 38, 38, 0.06)', border: `1px solid ${C.danger}`,
            color: C.danger, fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={saving}
          style={{
            width: '100%', padding: '12px',
            borderRadius: '8px', border: 'none',
            backgroundColor: C.accent, color: C.bg,
            fontWeight: 600, fontSize: '15px',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '저장 중...' : '추가하기'}
        </button>
      </div>
    </div>
  );
}
