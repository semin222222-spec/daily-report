-- ============================================================
-- 030_closing_logs.sql — 마감일지
--
-- 직원이 마감 후 메모장에 적어 보내던 내용(오픈런·예약·만석 시각·
-- 매장 컨디션·지각/컴플레인/재고이슈·메뉴 판매량·특이사항·발주메모)을
-- 매장·날짜별 한 장으로 저장한다. 매출 숫자는 daily_closings(일마감)에 따로 있다.
--
-- 메뉴 판매량과 특이사항은 매장마다 항목이 달라서 jsonb 배열로 둔다.
--   menu_sales: [{ "name": "찰랑", "qty": 11 }, …]
--   issues:     [{ "type": "추가결제", "text": "…", "amount": 10000 }, …]
--
-- 접근: 일마감과 같다 — 오너는 전 매장, 점장은 자기 매장만.
--
-- 029 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================

create table if not exists closing_logs (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references stores(id) on delete cascade,
  date             date not null,
  writer           text not null default '',          -- 작성자 이름 (마감조)
  open_run         int  not null default 0,           -- 오픈런 팀 수
  naver_bookings   int  not null default 0,           -- 네이버 예약 팀 수
  full_at          text not null default '',          -- 만석 시각 'HH:MM', 없으면 ''
  condition        int  not null default 7 check (condition between 1 and 10),
  late             boolean not null default false,
  late_note        text not null default '',
  complaint        boolean not null default false,
  complaint_note   text not null default '',
  stock_issue      boolean not null default false,
  stock_issue_note text not null default '',
  menu_sales       jsonb not null default '[]'::jsonb,
  issues           jsonb not null default '[]'::jsonb,
  note             text not null default '',          -- 발주·전달사항
  created_by       uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (store_id, date)
);

create index if not exists idx_closing_logs_store_date
  on closing_logs (store_id, date desc);

drop trigger if exists trg_closing_logs_updated on closing_logs;
create trigger trg_closing_logs_updated before update on closing_logs
  for each row execute function touch_updated_at();

alter table closing_logs enable row level security;

drop policy if exists closing_logs_all on closing_logs;
create policy closing_logs_all on closing_logs for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

grant select, insert, update, delete on closing_logs to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────
select count(*) as 마감일지 from closing_logs;
