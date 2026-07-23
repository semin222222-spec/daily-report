-- ============================================
-- 003_attendance.sql
-- 알바 출퇴근(근태) 시스템
-- 001_schema.sql / 002_auth_and_rls.sql 실행 후에 실행하세요
--
-- 설계 메모
--   - 매장 식별: store_name 텍스트 (기존 daily_reports / user_profiles 와 동일)
--   - 권한: manager = 자기 매장만 / owner = 전 매장 읽기+쓰기
--           002_auth_and_rls.sql 의 current_user_role() / current_user_store() 재사용
--   - 새벽 퇴근: work_date = "출근일"(KST 기준). 02:30 퇴근도 출근일에 귀속.
--   - 하루 1건: unique(staff_id, work_date) 로 동시/중복 출근 방지
--   - 알바 삭제: hard delete 안 함. is_active=false (soft delete)
-- ============================================

-- ============================================
-- 1. 알바 마스터
-- ============================================
create table if not exists attendance_staff (
  id uuid primary key default gen_random_uuid(),
  store_name text not null check (store_name in
    ('삐딱 서울대점', '삐딱 문래점', '삐딱 연남점', '우삼집', '쑥고개')),
  name text not null,
  is_active boolean not null default true,   -- soft delete
  hired_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_attendance_staff_store
  on attendance_staff (store_name, is_active);

-- ============================================
-- 2. 출퇴근 기록
-- ============================================
create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  store_name text not null check (store_name in
    ('삐딱 서울대점', '삐딱 문래점', '삐딱 연남점', '우삼집', '쑥고개')),
  staff_id uuid not null references attendance_staff(id) on delete restrict,
  work_date date not null,                    -- 출근일(KST). 새벽 퇴근도 이 날짜 기준
  check_in_at timestamptz not null,
  check_out_at timestamptz,                   -- null = 아직 근무중
  is_manual boolean not null default false,   -- 수동 입력(버튼 안 누르고 직접 작성)
  modified_by_admin boolean not null default false,
  modified_at timestamptz,
  note text default '',
  created_at timestamptz not null default now(),

  unique (staff_id, work_date)                -- 하루 1건 (동시/중복 출근 방지)
);

create index if not exists idx_attendance_records_store_date
  on attendance_records (store_name, work_date desc);
-- "근무중"(미퇴근) 기록을 빨리 찾기 위한 부분 인덱스
create index if not exists idx_attendance_records_open
  on attendance_records (staff_id) where check_out_at is null;

-- updated_at 자동 갱신 (001_schema.sql 의 update_updated_at_column() 재사용)
drop trigger if exists set_attendance_staff_updated_at on attendance_staff;
create trigger set_attendance_staff_updated_at
before update on attendance_staff
for each row execute function update_updated_at_column();

-- ============================================
-- 3. RLS — manager: 자기 매장만 / owner: 전 매장
--    current_user_role() / current_user_store() 는 002 에서 정의됨
-- ============================================
alter table attendance_staff enable row level security;
alter table attendance_records enable row level security;

-- ---- attendance_staff ----
drop policy if exists "att_staff_select" on attendance_staff;
create policy "att_staff_select" on attendance_staff
  for select using (
    current_user_role() = 'owner'
    or (current_user_role() = 'manager' and store_name = current_user_store())
  );

drop policy if exists "att_staff_insert" on attendance_staff;
create policy "att_staff_insert" on attendance_staff
  for insert with check (
    current_user_role() = 'owner'
    or (current_user_role() = 'manager' and store_name = current_user_store())
  );

drop policy if exists "att_staff_update" on attendance_staff;
create policy "att_staff_update" on attendance_staff
  for update using (
    current_user_role() = 'owner'
    or (current_user_role() = 'manager' and store_name = current_user_store())
  );

-- ---- attendance_records ----
drop policy if exists "att_rec_select" on attendance_records;
create policy "att_rec_select" on attendance_records
  for select using (
    current_user_role() = 'owner'
    or (current_user_role() = 'manager' and store_name = current_user_store())
  );

drop policy if exists "att_rec_insert" on attendance_records;
create policy "att_rec_insert" on attendance_records
  for insert with check (
    current_user_role() = 'owner'
    or (current_user_role() = 'manager' and store_name = current_user_store())
  );

drop policy if exists "att_rec_update" on attendance_records;
create policy "att_rec_update" on attendance_records
  for update using (
    current_user_role() = 'owner'
    or (current_user_role() = 'manager' and store_name = current_user_store())
  );

-- 기록은 삭제(DELETE) 정책을 두지 않음 → 시간 분쟁 방지를 위해 이력 보존.
-- 잘못된 기록은 UPDATE(수정)로만 정정.

-- ============================================
-- 적용 후 점검
--
--   \d attendance_staff
--   \d attendance_records
--
--   -- RLS 정책 확인
--   select tablename, policyname, cmd from pg_policies
--   where tablename in ('attendance_staff','attendance_records')
--   order by tablename, cmd;
--
--   -- (옵션) 매장별 첫 알바 등록 예시 — store_name 은 실제 매장명 그대로
--   -- insert into attendance_staff (store_name, name, hired_at) values
--   --   ('삐딱 서울대점', '홍길동', current_date);
-- ============================================
