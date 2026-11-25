-- 점주센터·임원전용 자료를 "권한 받은 계정만" 읽도록 DB에서 잠근다.
-- 지금까지는 화면 메뉴만 숨겼고 DB 읽기 정책은 true(로그인만 하면 전부)였다.
-- 화면 권한 규칙(lib/permissions.ts)과 똑같이:
--   점주센터 기본값 = 조회(view), 임원전용 기본값 = 숨김(hidden), 오너는 전부.

create or replace function public.can_view_owner_center()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and (role = 'owner' or coalesce(permissions->>'/owner-center', 'view') in ('view', 'edit'))
  );
$$;

create or replace function public.can_view_executive()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and (role = 'owner' or coalesce(permissions->>'/executive', 'hidden') in ('view', 'edit'))
  );
$$;

-- 레시피: 공개 범위가 정해진 매장은 그 목록만, 아니면 점주센터 조회 권한이 있어야
create or replace function public.can_read_recipe(rid uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select can_edit_owner_center()
    or coalesce((
      select case
        when s.recipe_ids is not null then rid = any(s.recipe_ids)
        else can_view_owner_center()
      end
      from profiles p
      left join stores s on s.id = p.store_id
      where p.id = auth.uid()
    ), false);
$$;

drop policy if exists recipe_categories_read on recipe_categories;
create policy recipe_categories_read on recipe_categories for select to authenticated
  using (true); -- 분류 이름(육회·메인요리…)만이라 공개해도 무방

-- 자료실 파일 목록: 임원전용 폴더는 임원 권한, 나머지는 점주센터 권한
drop policy if exists oc_files_read on oc_files;
create policy oc_files_read on oc_files for select to authenticated
  using (case when folder = 'executive' then can_view_executive() else can_view_owner_center() end);

-- 회의록은 임원전용에서만 쓴다
drop policy if exists meeting_notes_read on meeting_notes;
create policy meeting_notes_read on meeting_notes for select to authenticated
  using (can_view_executive());

-- 오픈 체크리스트·집기 발주는 임원전용 + 점주센터(쿠팡 발주)에서 같이 쓴다
drop policy if exists open_checklists_read on open_checklists;
create policy open_checklists_read on open_checklists for select to authenticated
  using (can_view_executive() or can_view_owner_center());
drop policy if exists open_tasks_read on open_checklist_tasks;
create policy open_tasks_read on open_checklist_tasks for select to authenticated
  using (can_view_executive() or can_view_owner_center());
drop policy if exists equip_orders_read on equip_orders;
create policy equip_orders_read on equip_orders for select to authenticated
  using (can_view_executive() or can_view_owner_center());
drop policy if exists equip_items_read on equip_order_items;
create policy equip_items_read on equip_order_items for select to authenticated
  using (can_view_executive() or can_view_owner_center());

-- 점주센터 체크리스트류 (점장이 체크하므로 쓰기도 허용하되, 점주센터 권한자만)
drop policy if exists oc_categories_all on oc_categories;
create policy oc_categories_all on oc_categories for all to authenticated
  using (can_view_owner_center()) with check (can_view_owner_center());
drop policy if exists oc_items_all on oc_items;
create policy oc_items_all on oc_items for all to authenticated
  using (can_view_owner_center()) with check (can_view_owner_center());
drop policy if exists setup_checklists_read on setup_checklists;
create policy setup_checklists_read on setup_checklists for select to authenticated
  using (can_view_owner_center());
drop policy if exists setup_items_all on setup_checklist_items;
create policy setup_items_all on setup_checklist_items for all to authenticated
  using (can_view_owner_center()) with check (can_view_owner_center());

-- 파일 저장소: 경로 첫 폴더로 구분
--   executive/…              → 임원 권한
--   recipe-photos/, recipe-videos/ → 그 사진·영상의 레시피를 볼 수 있으면 (recipes RLS가 걸러줌)
--   그 밖(design/manual/recipe…)  → 점주센터 권한
drop policy if exists oc_obj_read on storage.objects;
create policy oc_obj_read on storage.objects for select to authenticated
  using (
    bucket_id = 'owner-center' and (
      case split_part(objects.name, '/', 1)
        when 'executive' then public.can_view_executive()
        when 'recipe-photos' then public.can_view_owner_center()
          or exists (select 1 from public.recipes r where r.photo_path = objects.name)
        when 'recipe-videos' then public.can_view_owner_center()
          or exists (select 1 from public.recipes r where r.video_path = objects.name)
        else public.can_view_owner_center()
      end
    )
  );
