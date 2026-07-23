-- ============================================
-- 001_schema.sql
-- 매장 마감 보고 시스템 DB 스키마
-- Supabase SQL Editor에서 실행하세요
-- ============================================

create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),

  -- 기본
  store_name text not null check (store_name in ('술집1', '술집2', '술집3', '술집4', '고기집1')),
  report_date date not null default current_date,

  -- 매출
  total_sales numeric(12, 0) not null default 0,
  card_amount numeric(12, 0) not null default 0,
  cash_amount numeric(12, 0) not null default 0,
  discount_amount numeric(12, 0) not null default 0,
  other_amount numeric(12, 0) not null default 0,
  cash_on_hand numeric(12, 0) not null default 0,

  -- 재고 / 점검
  low_stock text default '',
  order_needed text default '',

  -- 위생 / 시설
  check_kitchen boolean not null default false,
  check_hall boolean not null default false,
  check_trash boolean not null default false,
  check_gas boolean not null default false,
  check_electric boolean not null default false,

  -- 인원 (직원 / 파트타이머 분리)
  staff_fulltime int not null default 0,
  staff_parttime int not null default 0,

  -- 특이사항
  attendance_issue text default '',
  complaint text default '',
  summary text default '',

  -- 주요 이슈 (배열: 'complaint' | 'equipment' | 'stockout' | 'facility')
  issues text[] not null default '{}',

  -- 고객 통계 (한국 + 외국인 3종)
  total_teams int not null default 0,
  customer_korean int not null default 0,
  foreigner_chinese int not null default 0,
  foreigner_japanese int not null default 0,
  foreigner_other int not null default 0,
  reservation_count int not null default 0,
  waiting_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (store_name, report_date)
);

create index if not exists idx_daily_reports_date on daily_reports (report_date desc);
create index if not exists idx_daily_reports_store_date on daily_reports (store_name, report_date desc);
-- 이슈가 있는 보고서만 빨리 찾기 위한 GIN 인덱스
create index if not exists idx_daily_reports_issues on daily_reports using gin (issues);

-- updated_at 자동 갱신
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on daily_reports;
create trigger set_updated_at
before update on daily_reports
for each row execute function update_updated_at_column();

-- 초기 개발용 RLS (Auth 연결 후 002_auth_and_rls.sql로 교체)
alter table daily_reports enable row level security;

drop policy if exists "allow_all_read" on daily_reports;
create policy "allow_all_read" on daily_reports for select using (true);

drop policy if exists "allow_all_insert" on daily_reports;
create policy "allow_all_insert" on daily_reports for insert with check (true);

drop policy if exists "allow_all_update" on daily_reports;
create policy "allow_all_update" on daily_reports for update using (true);
