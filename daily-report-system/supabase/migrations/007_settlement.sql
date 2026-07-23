-- ============================================================
-- 007_settlement.sql — 월정산 수기 입력 시트
--
-- 006 까지 실행한 뒤에 돌린다.
--
-- 바뀌는 것:
--   월정산이 "일마감에서 자동 계산"에서 "월별 수기 입력 시트"로 바뀐다.
--   인건비·식자재·마케팅·고정비를 항목별로 직접 적고, 매출에서 빼서 총수익을 낸다.
--
--   인건비는 달마다 달라지므로 월(ym) 단위로 저장한다.
--   7월 시트를 만들어두면 8월이 되어도 7월 것이 그대로 남는다.
-- ============================================================


-- ── 월 시트 (매장 × 월 1건) ──────────────────────────────────
create table if not exists monthly_settlements (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  ym           text not null check (ym ~ '^\d{4}-\d{2}$'),   -- '2026-07'

  -- 총매출. 기본값은 일마감 합계를 가져오지만 직접 고칠 수 있다.
  total_sales  bigint  not null default 0,
  -- true면 화면에서 일마감 합계를 계속 따라간다. 직접 고치면 false가 된다.
  sales_auto   boolean not null default true,

  memo         text not null default '',
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (store_id, ym)
);

create index if not exists idx_settlements_store_ym
  on monthly_settlements (store_id, ym desc);


-- ── 항목 줄 ──────────────────────────────────────────────────
-- 인건비(직원/알바)·식자재·마케팅및기타·고정비를 한 테이블로 받는다.
-- 카테고리만 다를 뿐 "이름 + 금액" 구조가 같기 때문.
create table if not exists settlement_items (
  id             uuid primary key default gen_random_uuid(),
  settlement_id  uuid not null references monthly_settlements(id) on delete cascade,
  -- RLS를 단순하게 쓰려고 매장을 같이 들고 있는다
  store_id       uuid not null references stores(id) on delete cascade,

  category       text not null check (category in (
                   'labor_staff',  -- 인건비 · 직원
                   'labor_part',   -- 인건비 · 알바
                   'food',         -- 식자재 비용
                   'marketing',    -- 마케팅 및 기타
                   'fixed'         -- 고정비용
                 )),
  name           text   not null default '',
  amount         bigint not null default 0,
  sort_order     int    not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists idx_settlement_items_lookup
  on settlement_items (settlement_id, category, sort_order);


-- ── updated_at ───────────────────────────────────────────────
drop trigger if exists trg_settlements_updated on monthly_settlements;
create trigger trg_settlements_updated before update on monthly_settlements
  for each row execute function touch_updated_at();


-- ── RLS — 다른 테이블과 동일 ─────────────────────────────────
alter table monthly_settlements enable row level security;
alter table settlement_items    enable row level security;

drop policy if exists settlements_all on monthly_settlements;
create policy settlements_all on monthly_settlements for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

drop policy if exists settlement_items_all on settlement_items;
create policy settlement_items_all on settlement_items for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

grant select, insert, update, delete on
  monthly_settlements, settlement_items
  to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────
-- 2행 나오면 성공.
select tablename, count(*) as 정책수
from pg_policies
where schemaname = 'public'
  and tablename in ('monthly_settlements', 'settlement_items')
group by tablename
order by tablename;
