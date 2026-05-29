import { supabase } from './supabase';
import { STORES, StoreName } from './supabase';

// ============================================
// 타입
// ============================================
export type Staff = {
  id: string;
  store_name: StoreName;
  name: string;
  is_active: boolean;
  hired_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AttendanceRecord = {
  id: string;
  store_name: StoreName;
  staff_id: string;
  work_date: string;          // 'YYYY-MM-DD' (출근일, KST 기준)
  check_in_at: string;        // ISO (timestamptz)
  check_out_at: string | null;
  is_manual: boolean;
  modified_by_admin: boolean;
  modified_at: string | null;
  note: string | null;
  created_at?: string;
};

// ============================================
// KST(Asia/Seoul) 시간 헬퍼
//
//  기존 코드의 new Date().toISOString() 은 UTC라 KST 자정 근처에서
//  날짜가 하루 어긋난다(새벽 영업엔 치명적). 근태는 전부 KST로 계산한다.
// ============================================

// Date → 'YYYY-MM-DD' (Asia/Seoul). en-CA 로케일이 ISO 형식을 준다.
export const kstDateStr = (d: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

// ISO timestamp → 'HH:MM' (Asia/Seoul, 24시간)
export const kstTimeStr = (iso: string): string =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

// 'YYYY-MM-DD' + 'HH:MM' (KST 벽시계) → ISO. KST = UTC+9 오프셋으로 정확히 변환.
export const combineKst = (dateStr: string, time: string): string =>
  new Date(`${dateStr}T${time}:00+09:00`).toISOString();

// 두 시각 차이를 시간(h)으로. 미퇴근이면 null.
export const hoursBetween = (
  inISO: string,
  outISO: string | null
): number | null => {
  if (!outISO) return null;
  const ms = new Date(outISO).getTime() - new Date(inISO).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
};

// 8.5 → "8시간 30분"
export const formatDuration = (h: number | null): string => {
  if (h === null) return '근무중';
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return `${mm}분`;
  if (mm === 0) return `${hh}시간`;
  return `${hh}시간 ${mm}분`;
};

// 'YYYY-MM-DD' → 요일 (KST). '월' '화' ... '일'
export const kstWeekday = (dateStr: string): string =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(new Date(`${dateStr}T00:00:00+09:00`));

// 새벽 퇴근(출근일과 퇴근일이 다른 날, KST)이면 "02:30⁺¹" 표기
export const formatCheckOut = (
  checkInISO: string,
  checkOutISO: string | null
): string => {
  if (!checkOutISO) return '—';
  const time = kstTimeStr(checkOutISO);
  const overnight = kstDateStr(new Date(checkInISO)) !== kstDateStr(new Date(checkOutISO));
  return overnight ? `${time}⁺¹` : time;
};

// 월 범위 'YYYY-MM-01' ~ 'YYYY-MM-말일'
const monthRange = (year: number, month: number) => {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

// ============================================
// 알바 마스터 쿼리
// ============================================

// 알바 목록. store 미지정(owner 전체)이면 RLS 범위 내 전 매장.
// includeInactive=false 면 활성 알바만.
export async function listStaff(
  store?: StoreName,
  includeInactive = false
): Promise<Staff[]> {
  let q = supabase.from('attendance_staff').select('*');
  if (store) q = q.eq('store_name', store);
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q.order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as Staff[];
}

export async function addStaff(input: {
  store_name: StoreName;
  name: string;
  hired_at?: string | null;
}): Promise<Staff> {
  const { data, error } = await supabase
    .from('attendance_staff')
    .insert({
      store_name: input.store_name,
      name: input.name.trim(),
      hired_at: input.hired_at || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Staff;
}

// soft delete (hard delete 금지)
export async function deactivateStaff(staffId: string): Promise<void> {
  const { error } = await supabase
    .from('attendance_staff')
    .update({ is_active: false })
    .eq('id', staffId);
  if (error) throw error;
}

export async function reactivateStaff(staffId: string): Promise<void> {
  const { error } = await supabase
    .from('attendance_staff')
    .update({ is_active: true })
    .eq('id', staffId);
  if (error) throw error;
}

// 이름 수정 (오타 정정용). 기존 UPDATE RLS 정책으로 동작.
export async function renameStaff(staffId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('이름이 비어 있습니다');
  const { error } = await supabase
    .from('attendance_staff')
    .update({ name: trimmed })
    .eq('id', staffId);
  if (error) throw error;
}

// 완전 삭제 (출퇴근 기록까지 영구 삭제). 되돌릴 수 없음.
//  - 004_attendance_delete.sql 의 delete_staff_cascade RPC 필요.
//  - 권한 검사는 RPC 내부에서 (owner 전체 / manager 자기 매장).
export async function deleteStaff(staffId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_staff_cascade', { p_staff_id: staffId });
  if (error) throw error;
}

// ============================================
// 출퇴근 기록 쿼리
// ============================================

// 특정 월의 기록. store 미지정이면 RLS 범위 내 전체.
export async function getMonthRecords(
  year: number,
  month: number,
  store?: StoreName
): Promise<AttendanceRecord[]> {
  const { start, end } = monthRange(year, month);
  let q = supabase
    .from('attendance_records')
    .select('*')
    .gte('work_date', start)
    .lte('work_date', end);
  if (store) q = q.eq('store_name', store);
  const { data, error } = await q.order('work_date', { ascending: false });
  if (error) throw error;
  return (data || []) as AttendanceRecord[];
}

// 한 알바의 특정 월 기록 (상세 모달용)
export async function getStaffMonthRecords(
  staffId: string,
  year: number,
  month: number
): Promise<AttendanceRecord[]> {
  const { start, end } = monthRange(year, month);
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('staff_id', staffId)
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date', { ascending: false });
  if (error) throw error;
  return (data || []) as AttendanceRecord[];
}

// 현재 근무중(미퇴근) 기록 — 출퇴근 화면 상태 판단용.
// 새벽까지 이어진 어제자 기록도 잡히도록 work_date 로 거르지 않는다.
export async function getOpenRecords(store?: StoreName): Promise<AttendanceRecord[]> {
  let q = supabase
    .from('attendance_records')
    .select('*')
    .is('check_out_at', null);
  if (store) q = q.eq('store_name', store);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as AttendanceRecord[];
}

// 오늘(KST) 기록 — 출퇴근 화면에서 "퇴근 완료" 판단용
export async function getTodayRecords(store?: StoreName): Promise<AttendanceRecord[]> {
  const today = kstDateStr();
  let q = supabase
    .from('attendance_records')
    .select('*')
    .eq('work_date', today);
  if (store) q = q.eq('store_name', store);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as AttendanceRecord[];
}

// 출근: 오늘(KST) work_date 로 기록 생성. 이미 있으면(중복 출근) 무시.
export async function checkIn(staff: Staff): Promise<void> {
  const { error } = await supabase
    .from('attendance_records')
    .insert({
      store_name: staff.store_name,
      staff_id: staff.id,
      work_date: kstDateStr(),
      check_in_at: new Date().toISOString(),
      is_manual: false,
    });
  // 23505 = unique_violation (이미 오늘 출근함) → 조용히 무시
  if (error && (error as { code?: string }).code !== '23505') throw error;
}

// 퇴근: 해당 알바의 열린(미퇴근) 기록을 닫는다. 어제자 새벽 근무도 처리됨.
export async function checkOut(recordId: string): Promise<void> {
  const { error } = await supabase
    .from('attendance_records')
    .update({ check_out_at: new Date().toISOString() })
    .eq('id', recordId)
    .is('check_out_at', null);
  if (error) throw error;
}

// 관리자 수동 입력/수정.
//  - work_date 기준 upsert (unique staff_id+work_date)
//  - 퇴근이 출근보다 이르거나 같으면 → 다음날로 자동 보정(새벽 퇴근)
//  - modified_by_admin=true, is_manual=true, modified_at=now()
export async function upsertManual(input: {
  store_name: StoreName;
  staff_id: string;
  work_date: string;        // 'YYYY-MM-DD'
  check_in_time: string;    // 'HH:MM'
  check_out_time: string | null; // 'HH:MM' | null
  note?: string;
}): Promise<void> {
  const checkInISO = combineKst(input.work_date, input.check_in_time);
  let checkOutISO: string | null = null;
  if (input.check_out_time) {
    checkOutISO = combineKst(input.work_date, input.check_out_time);
    // 퇴근 <= 출근 이면 새벽 퇴근 → 다음날로
    if (new Date(checkOutISO).getTime() <= new Date(checkInISO).getTime()) {
      const next = new Date(new Date(checkOutISO).getTime() + 24 * 3_600_000);
      checkOutISO = next.toISOString();
    }
  }

  const { error } = await supabase
    .from('attendance_records')
    .upsert(
      {
        store_name: input.store_name,
        staff_id: input.staff_id,
        work_date: input.work_date,
        check_in_at: checkInISO,
        check_out_at: checkOutISO,
        is_manual: true,
        modified_by_admin: true,
        modified_at: new Date().toISOString(),
        note: input.note ?? '',
      },
      { onConflict: 'staff_id,work_date' }
    );
  if (error) throw error;
}

// 기존 기록(id)을 직접 수정. 날짜(work_date) 변경도 허용한다.
//  - 새벽 퇴근 자동 보정(퇴근 <= 출근이면 다음날로)
//  - 다른 기록과 (staff_id, work_date) 가 겹치면 23505 (unique_violation) 발생
//    → 호출 측에서 안내. (예: "그 날짜에 이미 다른 기록이 있습니다")
export async function updateRecord(
  recordId: string,
  input: {
    work_date: string;
    check_in_time: string;
    check_out_time: string | null;
    note?: string;
  }
): Promise<void> {
  const checkInISO = combineKst(input.work_date, input.check_in_time);
  let checkOutISO: string | null = null;
  if (input.check_out_time) {
    checkOutISO = combineKst(input.work_date, input.check_out_time);
    if (new Date(checkOutISO).getTime() <= new Date(checkInISO).getTime()) {
      const next = new Date(new Date(checkOutISO).getTime() + 24 * 3_600_000);
      checkOutISO = next.toISOString();
    }
  }

  const { error } = await supabase
    .from('attendance_records')
    .update({
      work_date: input.work_date,
      check_in_at: checkInISO,
      check_out_at: checkOutISO,
      is_manual: true,
      modified_by_admin: true,
      modified_at: new Date().toISOString(),
      note: input.note ?? '',
    })
    .eq('id', recordId);
  if (error) throw error;
}

// 기록 1건 삭제(잘못 누른 출퇴근 정정용).
//  - 005_attendance_record_delete.sql 의 delete_attendance_record RPC 필요.
//  - 권한 검사는 RPC 내부에서 (owner 전체 / manager 자기 매장).
export async function deleteRecord(recordId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_attendance_record', { p_record_id: recordId });
  if (error) throw error;
}

// ============================================
// 집계
// ============================================
export type StaffSummary = {
  staff_id: string;
  totalHours: number;   // 퇴근 완료분만 합산
  daysWorked: number;   // 기록이 있는 날 수
  openCount: number;    // 미퇴근(근무중) 건수
};

// 월 기록 → 알바별 요약 맵
export function summarizeByStaff(records: AttendanceRecord[]): Record<string, StaffSummary> {
  const map: Record<string, StaffSummary> = {};
  for (const r of records) {
    const s = (map[r.staff_id] ??= {
      staff_id: r.staff_id,
      totalHours: 0,
      daysWorked: 0,
      openCount: 0,
    });
    s.daysWorked += 1;
    const h = hoursBetween(r.check_in_at, r.check_out_at);
    if (h === null) s.openCount += 1;
    else s.totalHours += h;
  }
  return map;
}

// ============================================
// CSV (엑셀) 내보내기
//   매트릭스: 행=날짜, 열=알바, 셀=그날 근무시간(소수). 하단에 월합계/근무일수.
//   한 표 안에 일별 시간과 월별 합산이 모두 들어간다.
// ============================================
const round2 = (h: number) => Math.round(h * 100) / 100;

// CSV 셀 이스케이프 (콤마/따옴표/줄바꿈 포함 시 따옴표 처리)
const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildAttendanceCsv(
  records: AttendanceRecord[],
  staffById: Record<string, Staff>,
  withStore: boolean // owner 전체 보기처럼 매장명을 열 이름에 붙일지
): string {
  // 열(알바): 기록이 1건 이상 있는 알바만, 이름순
  const ids = [...new Set(records.map((r) => r.staff_id))];
  const cols = ids
    .map((id) => ({ id, staff: staffById[id] as Staff | undefined }))
    .sort((a, b) => (a.staff?.name ?? '').localeCompare(b.staff?.name ?? '', 'ko'));

  // 행(날짜): 오름차순
  const dates = [...new Set(records.map((r) => r.work_date))].sort();

  // (날짜+알바) → 근무시간(완료분만). 미퇴근이면 null.
  const cell = new Map<string, number | null>();
  for (const r of records) {
    cell.set(`${r.work_date}__${r.staff_id}`, hoursBetween(r.check_in_at, r.check_out_at));
  }

  const colLabel = (c: { staff?: Staff }) => {
    const name = c.staff?.name ?? '(삭제됨)';
    return withStore && c.staff ? `${name} (${c.staff.store_name})` : name;
  };

  const rows: (string | number)[][] = [];
  rows.push(['날짜', '요일', ...cols.map(colLabel), '일계']);

  for (const d of dates) {
    let dayTotal = 0;
    const cells = cols.map((c) => {
      const h = cell.get(`${d}__${c.id}`);
      if (h == null) return ''; // 미퇴근/없음
      dayTotal += h;
      return round2(h);
    });
    rows.push([d, kstWeekday(d), ...cells, dayTotal ? round2(dayTotal) : '']);
  }

  // 월합계
  const totals = cols.map((c) =>
    dates.reduce((sum, d) => sum + (cell.get(`${d}__${c.id}`) ?? 0), 0)
  );
  const grand = totals.reduce((a, b) => a + b, 0);
  rows.push(['월합계', '', ...totals.map(round2), round2(grand)]);

  // 근무일수
  const days = cols.map((c) => dates.filter((d) => cell.has(`${d}__${c.id}`)).length);
  rows.push(['근무일수', '', ...days, '']);

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export { STORES };
export type { StoreName };
