-- ============================================================
-- 002_rls.sql — Row Level Security
-- 001_schema.sql 실행 후에 실행한다.
--
-- 원칙:
--   owner   → 모든 매장의 모든 행
--   manager → 본인 store_id 의 행만
-- 고정비·매장설정은 숫자가 전체 손익을 흔들기 때문에 점장은 읽기만 가능하다.
-- ============================================================

-- ── 헬퍼 ─────────────────────────────────────────────────────
-- security definer 로 선언해야 profiles 자신의 RLS를 재귀 호출하지 않는다.
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

-- 로그인한 사용자만 실행할 수 있게 제한
revoke execute on function is_owner() from public;
revoke execute on function my_store_id() from public;
grant execute on function is_owner() to authenticated;
grant execute on function my_store_id() to authenticated;

-- ── RLS 활성화 ───────────────────────────────────────────────
alter table stores          enable row level security;
alter table profiles        enable row level security;
alter table daily_closings  enable row level security;
alter table staff           enable row level security;
alter table fixed_costs     enable row level security;
alter table store_settings  enable row level security;
alter table todos           enable row level security;
alter table reviews         enable row level security;

-- ── stores ───────────────────────────────────────────────────
drop policy if exists stores_read on stores;
create policy stores_read on stores for select to authenticated
  using (is_owner() or id = my_store_id());

drop policy if exists stores_write on stores;
create policy stores_write on stores for all to authenticated
  using (is_owner()) with check (is_owner());

-- 로그인 화면의 매장 칩(삐딱·우삼집·쑥고개)을 실제 데이터로 그리기 위해
-- 비로그인 사용자에게도 매장 목록 읽기를 허용한다.
-- 노출되는 건 상호·색상뿐이라 공개해도 문제없다. 매출 데이터와는 무관.
drop policy if exists stores_anon_read on stores;
create policy stores_anon_read on stores for select to anon
  using (is_active);

-- ── profiles ─────────────────────────────────────────────────
-- 점장은 본인 프로필만 읽는다. 오너는 계정 관리 화면에서 전체를 본다.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or is_owner());

drop policy if exists profiles_write on profiles;
create policy profiles_write on profiles for all to authenticated
  using (is_owner()) with check (is_owner());

-- ── daily_closings ───────────────────────────────────────────
drop policy if exists closings_all on daily_closings;
create policy closings_all on daily_closings for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

-- ── staff ────────────────────────────────────────────────────
drop policy if exists staff_all on staff;
create policy staff_all on staff for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

-- ── fixed_costs (점장은 읽기 전용) ───────────────────────────
drop policy if exists fixed_read on fixed_costs;
create policy fixed_read on fixed_costs for select to authenticated
  using (is_owner() or store_id = my_store_id());

drop policy if exists fixed_write on fixed_costs;
create policy fixed_write on fixed_costs for all to authenticated
  using (is_owner()) with check (is_owner());

-- ── store_settings (점장은 읽기 전용) ────────────────────────
drop policy if exists settings_read on store_settings;
create policy settings_read on store_settings for select to authenticated
  using (is_owner() or store_id = my_store_id());

drop policy if exists settings_write on store_settings;
create policy settings_write on store_settings for all to authenticated
  using (is_owner()) with check (is_owner());

-- ── todos ────────────────────────────────────────────────────
drop policy if exists todos_all on todos;
create policy todos_all on todos for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());

-- ── reviews ──────────────────────────────────────────────────
-- 크롤러가 넣는 경로는 service_role 키를 쓰므로 RLS를 우회한다.
drop policy if exists reviews_all on reviews;
create policy reviews_all on reviews for all to authenticated
  using      (is_owner() or store_id = my_store_id())
  with check (is_owner() or store_id = my_store_id());
