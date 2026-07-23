-- ============================================================
-- 005_fix_rls.sql — RLS 정책 재적용 (002 를 대체한다)
--
-- 증상: 로그인은 되는데 화면이 비어 있고, SQL Editor에서는 보이는 데이터가
--       앱에서는 0행으로 나온다.
-- 원인: RLS는 켜졌는데 정책이 만들어지지 않은 상태.
--       정책이 없는 RLS 테이블은 "전부 차단"이 된다.
--
-- 이 파일은 몇 번을 실행해도 안전하다 (전부 drop → create).
-- 002_rls.sql 은 더 이상 실행하지 않아도 된다.
-- ============================================================


-- ── 1. 헬퍼 함수 ─────────────────────────────────────────────
-- security definer 로 만들어야 profiles 자신의 RLS를 재귀 호출하지 않는다.
create or replace function is_owner()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function my_store_id()
returns uuid language sql security definer stable
set search_path = public as $$
  select store_id from profiles where id = auth.uid();
$$;

grant execute on function is_owner()    to authenticated, anon;
grant execute on function my_store_id() to authenticated, anon;


-- ── 2. RLS 활성화 ────────────────────────────────────────────
alter table stores          enable row level security;
alter table profiles        enable row level security;
alter table daily_closings  enable row level security;
alter table staff           enable row level security;
alter table fixed_costs     enable row level security;
alter table store_settings  enable row level security;
alter table todos           enable row level security;
alter table reviews         enable row level security;


-- ── 3. 정책 ──────────────────────────────────────────────────
-- 원칙: owner = 전 매장 / manager = 본인 store_id 만
--       고정비·매장설정은 전체 손익을 흔들기 때문에 점장은 읽기 전용

-- stores ─────────────────────────────────────────────────────
drop policy if exists stores_read      on stores;
drop policy if exists stores_write     on stores;
drop policy if exists stores_anon_read on stores;

create policy stores_read on stores for select to authenticated
  using (is_owner() or id = my_store_id());

create policy stores_write on stores for all to authenticated
  using (is_owner()) with check (is_owner());

-- 로그인 화면의 매장 칩을 실제 데이터로 그리기 위한 비로그인 읽기.
-- 노출되는 건 상호·색상뿐이라 공개해도 매출 데이터와는 무관하다.
create policy stores_anon_read on stores for select to anon
  using (is_active);

-- profiles ───────────────────────────────────────────────────
drop policy if exists profiles_read  on profiles;
drop policy if exists profiles_write on profiles;

create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or is_owner());

create policy profiles_write on profiles for all to authenticated
  using (is_owner()) with check (is_owner());

-- daily_closings ─────────────────────────────────────────────
drop policy if exists closings_all on daily_closings;
create policy closings_all on daily_closings for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

-- staff ──────────────────────────────────────────────────────
drop policy if exists staff_all on staff;
create policy staff_all on staff for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

-- fixed_costs (점장 읽기 전용) ───────────────────────────────
drop policy if exists fixed_read  on fixed_costs;
drop policy if exists fixed_write on fixed_costs;

create policy fixed_read on fixed_costs for select to authenticated
  using (is_owner() or store_id = my_store_id());

create policy fixed_write on fixed_costs for all to authenticated
  using (is_owner()) with check (is_owner());

-- store_settings (점장 읽기 전용) ────────────────────────────
drop policy if exists settings_read  on store_settings;
drop policy if exists settings_write on store_settings;

create policy settings_read on store_settings for select to authenticated
  using (is_owner() or store_id = my_store_id());

create policy settings_write on store_settings for all to authenticated
  using (is_owner()) with check (is_owner());

-- todos ──────────────────────────────────────────────────────
drop policy if exists todos_all on todos;
create policy todos_all on todos for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

-- reviews ────────────────────────────────────────────────────
-- 크롤러 수집 경로는 service_role 키를 쓰므로 RLS를 우회한다.
drop policy if exists reviews_all on reviews;
create policy reviews_all on reviews for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());


-- ── 4. 테이블 접근 권한 ──────────────────────────────────────
-- RLS는 "어떤 행"을 거르는 장치이고, 이 GRANT는 "테이블을 열 수 있는지"다.
-- 둘 다 있어야 읽힌다. Supabase가 보통 자동으로 주지만 확실히 해둔다.
grant usage on schema public to anon, authenticated;
grant select on stores to anon;
grant select, insert, update, delete on
  stores, profiles, daily_closings, staff,
  fixed_costs, store_settings, todos, reviews
  to authenticated;


-- ── 5. 확인 ──────────────────────────────────────────────────
-- 아래가 14행 나오면 성공. (stores 3 + profiles 2 + 나머지 6개 테이블)
select tablename, policyname, roles::text as roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('stores','profiles','daily_closings','staff',
                    'fixed_costs','store_settings','todos','reviews')
order by tablename, policyname;
