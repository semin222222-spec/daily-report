import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// 상수
// ============================================
export const STORES = ['술집1', '술집2', '술집3', '술집4', '고기집1'] as const;
export type StoreName = (typeof STORES)[number];

export const ISSUE_TYPES = [
  { key: 'complaint', label: '컴플레인', icon: '😠' },
  { key: 'equipment', label: '기기 고장', icon: '🔧' },
  { key: 'stockout', label: '재료 품절', icon: '📦' },
  { key: 'facility', label: '시설 수리', icon: '🛠️' },
] as const;

export type IssueKey = (typeof ISSUE_TYPES)[number]['key'];

export const ISSUE_LABEL: Record<string, string> = Object.fromEntries(
  ISSUE_TYPES.map((i) => [i.key, i.label])
);
export const ISSUE_ICON: Record<string, string> = Object.fromEntries(
  ISSUE_TYPES.map((i) => [i.key, i.icon])
);

// ============================================
// 일일 보고서 타입
// ============================================
export type DailyReport = {
  id?: string;
  store_name: StoreName;
  report_date: string;

  // 매출
  total_sales: number;
  card_amount: number;
  cash_amount: number;
  discount_amount: number;
  other_amount: number;
  cash_on_hand: number;

  // 재고/점검
  low_stock: string;
  order_needed: string;

  // 위생/시설
  check_kitchen: boolean;
  check_hall: boolean;
  check_trash: boolean;
  check_gas: boolean;
  check_electric: boolean;

  // 인원
  staff_fulltime: number;
  staff_parttime: number;

  // 특이사항
  attendance_issue: string;
  complaint: string;
  summary: string;
  issues: string[];

  // 고객 통계
  total_teams: number;
  customer_korean: number;
  foreigner_chinese: number;
  foreigner_japanese: number;
  foreigner_other: number;
  reservation_count: number;
  waiting_count: number;

  created_at?: string;
  updated_at?: string;
};

export const emptyReport = (store: StoreName): DailyReport => ({
  store_name: store,
  report_date: new Date().toISOString().slice(0, 10),
  total_sales: 0,
  card_amount: 0,
  cash_amount: 0,
  discount_amount: 0,
  other_amount: 0,
  cash_on_hand: 0,
  low_stock: '',
  order_needed: '',
  check_kitchen: false,
  check_hall: false,
  check_trash: false,
  check_gas: false,
  check_electric: false,
  staff_fulltime: 0,
  staff_parttime: 0,
  attendance_issue: '',
  complaint: '',
  summary: '',
  issues: [],
  total_teams: 0,
  customer_korean: 0,
  foreigner_chinese: 0,
  foreigner_japanese: 0,
  foreigner_other: 0,
  reservation_count: 0,
  waiting_count: 0,
});

// ============================================
// 쿼리 함수
// ============================================

// upsert: 같은 매장+날짜면 덮어쓰기
export async function saveReport(report: DailyReport) {
  const { data, error } = await supabase
    .from('daily_reports')
    .upsert(report, { onConflict: 'store_name,report_date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 특정 월의 모든 보고서
export async function getMonthReports(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .gte('report_date', start)
    .lte('report_date', end)
    .order('report_date', { ascending: false });

  if (error) throw error;
  return (data || []) as DailyReport[];
}

// 특정 날짜 + 매장의 보고서 (점장이 오늘 쓴 거 불러오기용)
export async function getReport(store: StoreName, date: string) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('store_name', store)
    .eq('report_date', date)
    .maybeSingle();
  if (error) throw error;
  return data as DailyReport | null;
}

// 특정 날짜의 전 매장 보고서 (모달용)
export async function getReportsByDate(date: string) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('report_date', date);
  if (error) throw error;
  return (data || []) as DailyReport[];
}

// 오늘의 이슈 (대시보드 긴급알림용)
export async function getTodayIssues() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('daily_reports')
    .select('store_name, issues')
    .eq('report_date', today);
  if (error) throw error;

  const map: Record<string, string[]> = {};
  for (const store of STORES) map[store] = [];
  (data || []).forEach((r) => {
    map[r.store_name] = r.issues || [];
  });
  return map;
}

// 최근 제출된 보고서 (대시보드 리스트용)
export async function getRecentReports(limit = 5) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as DailyReport[];
}

// 전월 대비 비교
export async function getMonthComparison(year: number, month: number) {
  const current = await getMonthReports(year, month);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const previous = await getMonthReports(prevYear, prevMonth);

  const aggregate = (reports: DailyReport[]) => {
    const byStore: Record<string, number> = {};
    let total = 0;
    for (const r of reports) {
      byStore[r.store_name] = (byStore[r.store_name] || 0) + Number(r.total_sales);
      total += Number(r.total_sales);
    }
    return { byStore, total };
  };

  return {
    current: aggregate(current),
    previous: aggregate(previous),
    currentLabel: `${year}.${String(month).padStart(2, '0')}`,
    previousLabel: `${prevYear}.${String(prevMonth).padStart(2, '0')}`,
  };
}
