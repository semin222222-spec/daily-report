-- ============================================================
-- 001_schema.sql — 삐딱 데일리 리포트 v2 스키마
-- Supabase Dashboard → SQL Editor 에 붙여넣고 실행한다.
-- (구버전 daily_reports / user_profiles 테이블은 건드리지 않는다.
--  더 이상 쓰지 않으므로 확인 후 수동으로 drop 하면 된다.)
-- ============================================================

-- ── 매장 ─────────────────────────────────────────────────────
create table if not exists stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                       -- '삐딱'
  tag         text not null unique,                -- 'bbiddak' (로고 파일명·로그인 아이디)
  color       text not null default '#f0542d',
  badge       text not null default '?',           -- 한 글자 배지: 삐 / 우 / 쑥
  kind        text not null default 'franchise' check (kind in ('main', 'franchise')),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── 사용자 프로필 (auth.users 와 1:1) ────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  login_id    text not null unique,                -- 'admin' | 'bbiddak' — 아이디 로그인용
  name        text not null,
  role        text not null check (role in ('owner', 'manager')),
  store_id    uuid references stores(id) on delete restrict,
  created_at  timestamptz not null default now(),

  -- 점장은 반드시 매장이 지정돼야 하고, 오너는 특정 매장에 묶이지 않는다
  constraint role_store_match check (
    (role = 'manager' and store_id is not null) or
    (role = 'owner'   and store_id is null)
  )
);

-- ── 일마감 ───────────────────────────────────────────────────
create table if not exists daily_closings (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id) on delete cascade,
  date            date not null,
  guests          int    not null default 0,       -- 객수
  sales_card      bigint not null default 0,
  sales_cash      bigint not null default 0,
  sales_delivery  bigint not null default 0,       -- 배민·쿠팡 등
  sales_etc       bigint not null default 0,
  cost            bigint not null default 0,       -- 식자재 매입(원가)
  expense         bigint not null default 0,       -- 당일 지출(소모품 등)
  memo            text   not null default '',
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- 매장별 하루 1건. 재입력은 upsert로 덮어쓴다.
  unique (store_id, date)
);

create index if not exists idx_closings_store_date
  on daily_closings (store_id, date desc);

-- ── 직원 (인건비) ────────────────────────────────────────────
create table if not exists staff (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  name        text not null,
  position    text not null default '',            -- 홀 / 주방 / 점장
  pay_type    text not null check (pay_type in ('hourly', 'monthly')),
  rate        bigint not null default 0,           -- 시급 또는 월급
  work_hours  numeric(6,1) not null default 0,     -- 시급직의 월 근무시간
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_staff_store on staff (store_id, is_active);

-- ── 고정비 (매장당 1행) ──────────────────────────────────────
create table if not exists fixed_costs (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null unique references stores(id) on delete cascade,
  rent           bigint not null default 0,        -- 임대료
  mgmt           bigint not null default 0,        -- 관리비
  utility        bigint not null default 0,        -- 공과금(전기·가스·수도)
  insurance_etc  bigint not null default 0,        -- 보험·기타
  updated_at     timestamptz not null default now()
);

-- ── 매장 설정 (매장당 1행) ───────────────────────────────────
create table if not exists store_settings (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null unique references stores(id) on delete cascade,
  monthly_goal       bigint not null default 0,
  target_cost_rate   numeric(5,2) not null default 33.00,
  target_labor_rate  numeric(5,2) not null default 20.00,
  business_days      int not null default 30 check (business_days between 1 and 31),
  updated_at         timestamptz not null default now()
);

-- ── 오늘 할일 ────────────────────────────────────────────────
create table if not exists todos (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  text        text not null,
  done        boolean not null default false,
  assignee    text not null default '점장' check (assignee in ('홀', '주방', '점장')),
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);

create index if not exists idx_todos_store on todos (store_id, done, created_at desc);

-- ── 리뷰 ─────────────────────────────────────────────────────
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores(id) on delete cascade,
  source       text not null check (source in ('naver', 'kakao')),
  author       text not null default '',
  rating       numeric(2,1) not null default 5.0 check (rating between 0 and 5),
  text         text not null default '',
  posted_at    timestamptz not null default now(),
  is_new       boolean not null default true,
  -- 크롤러가 같은 리뷰를 두 번 넣지 않도록 하는 외부 식별자.
  -- 수동 입력은 null이며, null끼리는 unique 제약에 걸리지 않는다.
  external_id  text,
  created_at   timestamptz not null default now(),

  unique (store_id, source, external_id)
);

create index if not exists idx_reviews_store_posted
  on reviews (store_id, posted_at desc);

-- ── updated_at 자동 갱신 ─────────────────────────────────────
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_closings_updated on daily_closings;
create trigger trg_closings_updated before update on daily_closings
  for each row execute function touch_updated_at();

drop trigger if exists trg_fixed_updated on fixed_costs;
create trigger trg_fixed_updated before update on fixed_costs
  for each row execute function touch_updated_at();

drop trigger if exists trg_settings_updated on store_settings;
create trigger trg_settings_updated before update on store_settings
  for each row execute function touch_updated_at();

-- ── 매장 생성 시 고정비·설정 행을 자동으로 만들어 둔다 ───────
-- (없으면 설정 화면에서 매번 "행이 없음"을 처리해야 해서 번거롭다)
create or replace function seed_store_defaults()
returns trigger language plpgsql as $$
begin
  insert into fixed_costs (store_id) values (new.id) on conflict do nothing;
  insert into store_settings (store_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_store_defaults on stores;
create trigger trg_store_defaults after insert on stores
  for each row execute function seed_store_defaults();
