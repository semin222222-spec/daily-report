-- ============================================================
-- 006_schedule_and_reports.sql — 근무 스케줄 + 점장보고서
--
-- 005_fix_rls.sql 까지 실행한 뒤에 돌린다.
-- 여러 번 실행해도 안전하다.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. 근무 스케줄
-- ════════════════════════════════════════════════════════════

-- 직원 구분(직원 / 파트 / 파출) — 엑셀 시안의 "구분" 열
alter table staff add column if not exists emp_type text not null default '직원';

do $$ begin
  alter table staff add constraint staff_emp_type_check
    check (emp_type in ('직원', '파트', '파출'));
exception when duplicate_object then null;
end $$;

-- 스케줄 셀 하나 = 직원 1명의 하루
create table if not exists shifts (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  staff_id    uuid not null references staff(id) on delete cascade,
  date        date not null,
  -- 출근 / 휴무 / 홀 / 주방 / 오픈 / 마감 / 파출 등. 자유 입력도 허용한다.
  code        text not null,
  memo        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- 한 사람의 하루는 한 칸. 다시 누르면 덮어쓴다.
  unique (staff_id, date)
);

create index if not exists idx_shifts_store_date on shifts (store_id, date);

-- 날짜별 근무인원 목표 · 특이사항 (엑셀 시안 하단 두 줄)
create table if not exists schedule_days (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id) on delete cascade,
  date            date not null,
  target_kitchen  int  not null default 0,
  target_hall     int  not null default 0,
  note            text not null default '',
  updated_at      timestamptz not null default now(),

  unique (store_id, date)
);


-- ════════════════════════════════════════════════════════════
-- 2. 점장보고서
-- ════════════════════════════════════════════════════════════
-- 엑셀 시안의 6개 섹션을 그대로 컬럼으로 뒀다.
-- jsonb로 뭉뚱그리지 않은 이유: 섹션이 고정이고, 나중에 특정 섹션만
-- 검색·집계할 일이 생기기 때문.
create table if not exists manager_reports (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references stores(id) on delete cascade,
  period_type       text not null check (period_type in ('weekly', 'monthly')),
  period_start      date not null,
  period_end        date not null,

  sales_analysis    text not null default '',  -- 매출분석
  cost_analysis     text not null default '',  -- 비용 및 지출
  inventory         text not null default '',  -- 재고 관리
  customer_service  text not null default '',  -- 고객 서비스 및 경험
  staff_performance text not null default '',  -- 직원 성과 및 교육
  etc               text not null default '',  -- 기타 사항

  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- 같은 기간 보고서는 한 건. 다시 저장하면 수정된다.
  unique (store_id, period_type, period_start)
);

create index if not exists idx_reports_store_period
  on manager_reports (store_id, period_start desc);


-- ── updated_at 자동 갱신 ─────────────────────────────────────
drop trigger if exists trg_shifts_updated on shifts;
create trigger trg_shifts_updated before update on shifts
  for each row execute function touch_updated_at();

drop trigger if exists trg_schedule_days_updated on schedule_days;
create trigger trg_schedule_days_updated before update on schedule_days
  for each row execute function touch_updated_at();

drop trigger if exists trg_reports_updated on manager_reports;
create trigger trg_reports_updated before update on manager_reports
  for each row execute function touch_updated_at();


-- ════════════════════════════════════════════════════════════
-- 3. RLS — 다른 테이블과 동일한 규칙
--    owner = 전 매장 / manager = 본인 매장
-- ════════════════════════════════════════════════════════════
alter table shifts           enable row level security;
alter table schedule_days    enable row level security;
alter table manager_reports  enable row level security;

drop policy if exists shifts_all on shifts;
create policy shifts_all on shifts for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

drop policy if exists schedule_days_all on schedule_days;
create policy schedule_days_all on schedule_days for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

drop policy if exists reports_all on manager_reports;
create policy reports_all on manager_reports for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

-- RLS는 "어떤 행"이고 GRANT는 "테이블을 열 수 있는지". 둘 다 필요하다.
grant select, insert, update, delete on
  shifts, schedule_days, manager_reports
  to authenticated;


-- ════════════════════════════════════════════════════════════
-- 4. 기존 직원에 구분 채우기 (샘플)
-- ════════════════════════════════════════════════════════════
update staff set emp_type = '파트' where pay_type = 'hourly' and emp_type = '직원';


-- ── 확인 ─────────────────────────────────────────────────────
-- 3행 나오면 성공.
select tablename, count(*) as 정책수
from pg_policies
where schemaname = 'public'
  and tablename in ('shifts', 'schedule_days', 'manager_reports')
group by tablename
order by tablename;
