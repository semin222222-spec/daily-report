'use client';

import { useEffect, useState } from 'react';
import { C, S } from '@/lib/theme';
import ManualForm from './ManualForm';
import {
  AttendanceRecord,
  Staff,
  getStaffMonthRecords,
  deactivateStaff,
  renameStaff,
  deleteStaff,
  deleteRecord,
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

  // 이름 수정
  const [displayName, setDisplayName] = useState(staff.name);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(staff.name);
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState('');

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
    if (!confirm(`${displayName} 알바를 비활성화할까요?\n(기록은 보존됩니다. 목록에서만 숨겨집니다.)`)) return;
    try {
      await deactivateStaff(staff.id);
      onChanged();
      onClose();
    } catch (e) {
      console.error(e);
      alert('비활성화에 실패했습니다.');
    }
  };

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setRenameError('이름을 입력하세요.'); return; }
    if (trimmed === displayName) { setRenaming(false); return; }
    setRenameSaving(true);
    setRenameError('');
    try {
      await renameStaff(staff.id, trimmed);
      setDisplayName(trimmed);
      setRenaming(false);
      onChanged(); // 부모 목록 이름 갱신
    } catch (e) {
      console.error(e);
      setRenameError('이름 수정에 실패했습니다.');
    } finally {
      setRenameSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = confirm(
      `${displayName} 알바를 완전히 삭제할까요?\n\n` +
      `이 알바의 모든 출퇴근 기록도 함께 영구 삭제됩니다.\n` +
      `되돌릴 수 없습니다.\n\n` +
      `기록을 남기고 목록에서만 숨기려면 '비활성화'를 사용하세요.`
    );
    if (!ok) return;
    try {
      await deleteStaff(staff.id);
      onChanged();
      onClose();
    } catch (e) {
      console.error(e);
      alert('삭제에 실패했습니다.\n(권한 또는 마이그레이션 004 적용 여부를 확인하세요.)');
    }
  };

  // 기록 1건 삭제 (잘못 누른 출퇴근 정정용)
  const handleDeleteRecord = async (r: AttendanceRecord) => {
    if (!confirm(`${r.work_date} 기록을 삭제할까요?\n되돌릴 수 없습니다.`)) return;
    try {
      await deleteRecord(r.id);
      if (editing === r.work_date) setEditing(null);
      afterMutation();
    } catch (e) {
      console.error(e);
      alert('기록 삭제에 실패했습니다.\n(권한 또는 마이그레이션 005 적용 여부를 확인하세요.)');
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
            {!renaming ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <div style={{ fontSize: '22px', fontWeight: 600, color: C.text }}>
                  {displayName}
                </div>
                <button
                  onClick={() => { setNewName(displayName); setRenameError(''); setRenaming(true); }}
                  style={{
                    border: `1px solid ${C.border}`, backgroundColor: 'transparent',
                    color: C.textDim, fontSize: '11px', padding: '3px 8px',
                    borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  ✎ 이름수정
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '6px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    style={{ ...S.input, fontSize: '15px', maxWidth: '170px' }}
                    value={newName}
                    autoFocus
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') setRenaming(false);
                    }}
                  />
                  <button
                    onClick={handleRename}
                    disabled={renameSaving}
                    style={{
                      padding: '8px 12px', borderRadius: '6px', border: 'none',
                      backgroundColor: C.accent, color: C.bg, fontWeight: 600,
                      fontSize: '13px', cursor: renameSaving ? 'default' : 'pointer', opacity: renameSaving ? 0.6 : 1,
                    }}
                  >
                    {renameSaving ? '...' : '저장'}
                  </button>
                  <button
                    onClick={() => setRenaming(false)}
                    style={{
                      padding: '8px 10px', borderRadius: '6px',
                      border: `1px solid ${C.border}`, backgroundColor: 'transparent',
                      color: C.textDim, fontSize: '13px', cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                </div>
                {renameError && <div style={{ color: C.danger, fontSize: '12px', marginTop: '6px' }}>{renameError}</div>}
              </div>
            )}
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
                    <button
                      onClick={() => handleDeleteRecord(r)}
                      title="이 날짜 기록 삭제"
                      style={{
                        border: `1px solid ${C.danger}`, backgroundColor: 'transparent',
                        color: C.danger, fontSize: '11px', padding: '4px 8px',
                        borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      삭제
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

        {/* 비활성화 / 완전 삭제 */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            onClick={handleDeactivate}
            style={{
              border: `1px solid ${C.border}`, backgroundColor: 'transparent',
              color: C.textDim, fontSize: '12px', padding: '8px 14px',
              borderRadius: '8px', cursor: 'pointer',
            }}
          >
            비활성화 (기록 보존)
          </button>
          <button
            onClick={handleDelete}
            style={{
              border: `1px solid ${C.danger}`, backgroundColor: C.danger,
              color: '#fff', fontSize: '12px', fontWeight: 600, padding: '8px 14px',
              borderRadius: '8px', cursor: 'pointer',
            }}
          >
            완전 삭제 (기록까지)
          </button>
        </div>
      </div>
    </div>
  );
}

