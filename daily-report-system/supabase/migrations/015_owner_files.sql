-- ============================================================
-- 015_owner_files.sql — 점주센터 파일 보관함 (디자인·레시피·교육 등)
--
-- 디자인 폴더에 AI 파일 등 자료를 올리고 지운다.
-- Supabase Storage 버킷 + 메타데이터 테이블을 만든다.
--
-- 014 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
--
-- 권한: 보기·다운로드는 로그인 전원, 업로드·삭제는 관리자(owner)만.
--       (is_owner() 는 002/005에서 만든 헬퍼)
-- ============================================================

-- ── 파일 메타데이터 ──────────────────────────────────────────
create table if not exists oc_files (
  id          uuid primary key default gen_random_uuid(),
  folder      text not null,                 -- 'design' | 'recipe' | 'edu' | 'manual'
  name        text not null,                 -- 원본 파일명
  path        text not null,                 -- storage 경로
  size        bigint not null default 0,
  mime        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists idx_oc_files_folder on oc_files (folder, created_at desc);

alter table oc_files enable row level security;

drop policy if exists oc_files_read on oc_files;
create policy oc_files_read on oc_files for select to authenticated using (true);

drop policy if exists oc_files_write on oc_files;
create policy oc_files_write on oc_files for all to authenticated
  using (is_owner()) with check (is_owner());

grant select, insert, update, delete on oc_files to authenticated;


-- ── Storage 버킷 (비공개) ────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('owner-center', 'owner-center', false)
on conflict (id) do nothing;

-- 읽기(다운로드용 서명 URL 생성): 로그인 전원
drop policy if exists oc_obj_read on storage.objects;
create policy oc_obj_read on storage.objects for select to authenticated
  using (bucket_id = 'owner-center');

-- 업로드: 관리자만
drop policy if exists oc_obj_insert on storage.objects;
create policy oc_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'owner-center' and is_owner());

-- 삭제: 관리자만
drop policy if exists oc_obj_delete on storage.objects;
create policy oc_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'owner-center' and is_owner());


-- ── 확인 ─────────────────────────────────────────────────────
select
  (select count(*) from storage.buckets where id = 'owner-center') as 버킷,
  (select count(*) from information_schema.tables
     where table_name = 'oc_files') as 파일테이블;
