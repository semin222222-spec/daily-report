-- ============================================================
-- 029_owner_center_edit_perm.sql — 점주센터 수정 권한을 계정 권한 설정에 연동
--
-- 지금까지 점주센터(레시피·자료실·셋팅 체크리스트 삭제)는 쓰기가
-- is_owner() 로만 열려 있어서, 계정관리에서 점장에게 "수정가능"을 줘도
-- 실제로는 수정할 수 없었다.
--
-- can_edit_owner_center():
--   owner                                         → true
--   manager + permissions['/owner-center']='edit' → true
--   그 외(값 없음 포함)                            → false
--   (값이 없을 때 기본은 "조회만" — lib/permissions.ts 의 defaultLevel 과 맞춘다)
--
-- Supabase SQL Editor 에 통째로 붙여넣어 실행한다. 여러 번 실행해도 안전하다.
-- ============================================================

create or replace function can_edit_owner_center()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and (role = 'owner' or permissions->>'/owner-center' = 'edit')
  );
$$;

grant execute on function can_edit_owner_center() to authenticated;


-- ── 레시피 ───────────────────────────────────────────────────
drop policy if exists recipe_categories_write on recipe_categories;
create policy recipe_categories_write on recipe_categories for all to authenticated
  using (can_edit_owner_center()) with check (can_edit_owner_center());

drop policy if exists recipes_write on recipes;
create policy recipes_write on recipes for all to authenticated
  using (can_edit_owner_center()) with check (can_edit_owner_center());


-- ── 자료실 파일 ──────────────────────────────────────────────
drop policy if exists oc_files_write on oc_files;
create policy oc_files_write on oc_files for all to authenticated
  using (can_edit_owner_center()) with check (can_edit_owner_center());

drop policy if exists oc_obj_insert on storage.objects;
create policy oc_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'owner-center' and can_edit_owner_center());

drop policy if exists oc_obj_delete on storage.objects;
create policy oc_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'owner-center' and can_edit_owner_center());


-- (주방 집기·쿠팡 발주는 임원전용 화면과 같은 데이터라 오너 전용으로 둔다)


-- ── 가맹점 셋팅 체크리스트 (삭제만 제한돼 있었다) ────────────
drop policy if exists setup_checklists_delete on setup_checklists;
create policy setup_checklists_delete on setup_checklists for delete to authenticated
  using (can_edit_owner_center());


-- ── 확인: 계정별 점주센터 수정 가능 여부 ─────────────────────
select login_id, role, permissions->>'/owner-center' as 점주센터권한
from profiles order by role, login_id;
