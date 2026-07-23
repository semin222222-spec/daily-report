-- ============================================
-- 002_auth_and_rls.sql
-- 001_schema.sql 실행 후에 실행하세요
-- ============================================

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager')),
  store_name text check (store_name in ('술집1', '술집2', '술집3', '술집4', '고기집1')),
  display_name text,
  created_at timestamptz not null default now(),

  constraint manager_has_store check (
    (role = 'manager' and store_name is not null) or
    (role = 'owner' and store_name is null)
  )
);

alter table user_profiles enable row level security;

drop policy if exists "read_own_profile" on user_profiles;
create policy "read_own_profile" on user_profiles
  for select using (
    auth.uid() = user_id
    or exists (select 1 from user_profiles p where p.user_id = auth.uid() and p.role = 'owner')
  );

-- 헬퍼: 로그인 사용자의 role/store 조회 (재귀 방지 위해 security definer)
create or replace function current_user_role()
returns text language sql security definer stable as $$
  select role from user_profiles where user_id = auth.uid() limit 1;
$$;

create or replace function current_user_store()
returns text language sql security definer stable as $$
  select store_name from user_profiles where user_id = auth.uid() limit 1;
$$;

-- daily_reports RLS 교체
drop policy if exists "allow_all_read" on daily_reports;
drop policy if exists "allow_all_insert" on daily_reports;
drop policy if exists "allow_all_update" on daily_reports;

create policy "read_reports" on daily_reports
  for select using (
    current_user_role() = 'owner'
    or (current_user_role() = 'manager' and store_name = current_user_store())
  );

create policy "insert_own_store" on daily_reports
  for insert with check (
    current_user_role() = 'manager' and store_name = current_user_store()
  );

create policy "update_own_store" on daily_reports
  for update using (
    current_user_role() = 'manager' and store_name = current_user_store()
  );

-- ============================================
-- 초기 계정 등록 가이드
-- ============================================
-- 1) Supabase 대시보드 → Authentication → Users → Add user 에서
--    이메일/비밀번호로 계정을 먼저 생성 (사장 1, 점장 5)
-- 2) 각 계정의 User UID를 복사해서 아래처럼 실행:
--
-- insert into user_profiles (user_id, role, store_name, display_name) values
--   ('<사장님_UID>', 'owner', null, '사장님'),
--   ('<점장1_UID>', 'manager', '술집1', '김점장'),
--   ('<점장2_UID>', 'manager', '술집2', '이점장'),
--   ('<점장3_UID>', 'manager', '술집3', '박점장'),
--   ('<점장4_UID>', 'manager', '술집4', '최점장'),
--   ('<점장5_UID>', 'manager', '고기집1', '정점장');
