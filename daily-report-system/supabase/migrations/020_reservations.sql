-- ============================================================
-- 020_reservations.sql — 예약현황
--
-- 전화·네이버·캐치테이블 등으로 들어오는 매장 예약을 날짜별로 정리한다.
-- 매장별 데이터라 RLS는 다른 매장 테이블과 똑같이 간다.
--
-- 019 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================

create table if not exists reservations (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  date        date not null,
  -- 'HH:MM'. time 타입 대신 텍스트로 둔 이유: input type="time" 값이 그대로
  -- 들어오고 나가서 변환이 필요 없고, 0을 채운 문자열이라 정렬도 시간순이다.
  time        text not null default '',
  name        text not null default '',          -- 예약자명
  phone       text not null default '',          -- 연락처
  party_size  int  not null default 0,           -- 인원
  channel     text not null default '전화',       -- 전화 / 네이버 / 캐치테이블 …
  status      text not null default 'booked'
                check (status in ('booked','visited','noshow','canceled')),
  deposit     bigint not null default 0,         -- 예약금
  memo        text not null default '',          -- 요청사항 (창가석, 아기의자 등)
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 날짜별 조회가 전부라 (매장, 날짜, 시간) 순 인덱스 하나면 충분하다
create index if not exists idx_reservations_store_date
  on reservations (store_id, date, time);

drop trigger if exists trg_reservations_updated on reservations;
create trigger trg_reservations_updated before update on reservations
  for each row execute function touch_updated_at();

alter table reservations enable row level security;

drop policy if exists reservations_all on reservations;
create policy reservations_all on reservations for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

grant select, insert, update, delete on reservations to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────
select count(*) as 예약 from reservations;
