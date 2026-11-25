-- 매장별 레시피 공개 범위.
--   stores.recipe_ids = null  → 제한 없음 (지금까지처럼 점주센터 권한대로)
--   stores.recipe_ids = {...} → 그 매장 점장에게는 이 레시피만 보인다 (메뉴 "레시피"로 노출)
alter table stores add column if not exists recipe_ids uuid[];

-- 지금 로그인한 사람이 이 레시피를 볼 수 있는가
create or replace function public.can_read_recipe(rid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select can_edit_owner_center()
    or coalesce((
      select s.recipe_ids is null or rid = any(s.recipe_ids)
      from profiles p
      join stores s on s.id = p.store_id
      where p.id = auth.uid()
    ), true);
$$;

drop policy if exists recipes_read on recipes;
create policy recipes_read on recipes for select using (can_read_recipe(id));

-- 쑥고개: 국물닭발&주먹밥 · 된장술밥 · 참깨란탕
update stores
set recipe_ids = array[
  '32a170f6-ef94-4212-a26b-998a725499ca',
  'ba7b1d4b-3807-406a-9848-a67544a1a4ab',
  '01cf9ce1-0ec4-4f92-8dfd-292f9ec9a4bb'
]::uuid[]
where id = '4ce2b761-b356-4ff7-b741-40fec900187d';
