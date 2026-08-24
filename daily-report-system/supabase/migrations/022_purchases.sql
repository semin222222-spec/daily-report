-- ============================================================
-- 022_purchases.sql — 거래처 매입 현황
--
-- 엑셀 「거래처 매입 현황」을 그대로 옮긴다.
--   · 거래처(동원·태산·심도주류·조한유통·포정·네이버·오더히어로·쿠팡 …)를
--     매장마다 등록하고
--   · 날짜 × 거래처 한 칸에 매입액(VAT 포함)을 적는다
--   · 주(월~일) 합계 · 거래처 합계 · 매출 대비 매입비율은 계산해서 보여준다
--
-- 매출은 이미 daily_closings 에 있으므로 따로 적지 않는다.
--
-- 021 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================

-- 거래처 (매장별 목록)
create table if not exists purchase_vendors (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  name        text not null default '',          -- '동원', '태산(고기)' …
  sort_order  int  not null default 0,           -- 엑셀 열 순서
  is_active   boolean not null default true,     -- 거래 끊긴 곳은 끄기만 한다(과거 기록 보존)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_purchase_vendors_store
  on purchase_vendors (store_id, sort_order);

-- 같은 매장에 같은 이름의 거래처를 두 번 만들지 못하게 한다
create unique index if not exists uq_purchase_vendors_store_name
  on purchase_vendors (store_id, name);

-- 매입 한 칸 = 거래처 1곳의 하루
create table if not exists purchase_entries (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  vendor_id   uuid not null references purchase_vendors(id) on delete cascade,
  date        date not null,
  amount      bigint not null default 0,         -- VAT 포함 금액
  memo        text not null default '',
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 한 거래처의 같은 날짜는 한 줄만. 화면이 이 제약을 믿고 upsert 한다.
create unique index if not exists uq_purchase_entries_vendor_date
  on purchase_entries (vendor_id, date);

-- 월 단위 조회가 전부라 (매장, 날짜) 인덱스 하나로 충분하다
create index if not exists idx_purchase_entries_store_date
  on purchase_entries (store_id, date);

-- 요약표의 "비고" 칸 — 주(週)마다 한 줄
create table if not exists purchase_week_notes (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  ym          text not null,                     -- 'YYYY-MM'
  week_no     int  not null,                     -- 1~6
  note        text not null default '',
  updated_at  timestamptz not null default now()
);

create unique index if not exists uq_purchase_week_notes
  on purchase_week_notes (store_id, ym, week_no);

drop trigger if exists trg_purchase_vendors_updated on purchase_vendors;
create trigger trg_purchase_vendors_updated before update on purchase_vendors
  for each row execute function touch_updated_at();

drop trigger if exists trg_purchase_entries_updated on purchase_entries;
create trigger trg_purchase_entries_updated before update on purchase_entries
  for each row execute function touch_updated_at();

drop trigger if exists trg_purchase_week_notes_updated on purchase_week_notes;
create trigger trg_purchase_week_notes_updated before update on purchase_week_notes
  for each row execute function touch_updated_at();

alter table purchase_vendors    enable row level security;
alter table purchase_entries    enable row level security;
alter table purchase_week_notes enable row level security;

-- 매장 데이터라 다른 매장 테이블과 규칙이 같다: 오너 전체, 점장은 본인 매장.
drop policy if exists purchase_vendors_all on purchase_vendors;
create policy purchase_vendors_all on purchase_vendors for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

drop policy if exists purchase_entries_all on purchase_entries;
create policy purchase_entries_all on purchase_entries for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

drop policy if exists purchase_week_notes_all on purchase_week_notes;
create policy purchase_week_notes_all on purchase_week_notes for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

grant select, insert, update, delete on
  purchase_vendors, purchase_entries, purchase_week_notes to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────
select count(*) as 거래처 from purchase_vendors;
