/**
 * scripts/recipe-seed-data.ts 를 읽어 supabase/migrations/023_recipes.sql 을 생성한다.
 *
 *   npx tsx scripts/gen-recipe-migration.ts
 *
 * 데이터를 고칠 일이 있으면(신규 PDF 등) recipe-seed-data.ts 를 고친 뒤 이 스크립트를
 * 다시 돌려서 마이그레이션 파일을 새로 만든다. 마이그레이션 파일 자체는 손으로 고치지 않는다.
 */

import fs from 'node:fs'
import path from 'node:path'
import { SEED_CATEGORIES, SEED_RECIPES, CATEGORY_NAME } from './recipe-seed-data'

/** SQL 문자열 리터럴 이스케이프 ( ' -> '' ) */
function sql(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

function jsonbLiteral(value: unknown): string {
  return `${sql(JSON.stringify(value))}::jsonb`
}

const categoryValues = SEED_CATEGORIES.map(
  (c) => `  (${sql(c.name)}, ${c.sort})`
).join(',\n')

const recipeRows = SEED_RECIPES.map((r, i) => {
  const catName = CATEGORY_NAME[r.category]
  if (!catName) throw new Error(`알 수 없는 카테고리: ${r.category} (${r.slug})`)
  const photoPath = `recipe-photos/${r.slug}.jpg`
  return [
    '  (',
    `    ${sql(catName)},`,
    `    ${sql(r.name)},`,
    `    ${jsonbLiteral(r.ingredients)},`,
    `    ${sql(r.garnish ?? '')},`,
    `    ${sql(r.sauce ?? '')},`,
    `    ${jsonbLiteral(r.steps)},`,
    `    ${jsonbLiteral(r.notes)},`,
    `    ${jsonbLiteral(r.prep)},`,
    `    ${sql(photoPath)},`,
    `    ${i + 1}`,
    '  )',
  ].join('\n')
}).join(',\n')

const sqlText = `-- ============================================================
-- 023_recipes.sql — 점주센터 레시피 (DB화 + CRUD + 사진)
--
-- 지금까지 레시피는 코드 상수였다(lib/recipes.ts). 점주가 화면에서 직접
-- 추가·수정·삭제하고 사진도 올릴 수 있게 DB로 옮긴다.
--
-- 022 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다(카테고리·레시피가
-- 하나도 없을 때만 시드를 넣는다).
--
-- 사진은 기존 owner-center 버킷(015_owner_files.sql)을 그대로 쓴다.
-- 경로: recipe-photos/{레시피 slug}.jpg — 시드 사진은 scripts/seed-recipe-photos.ts 로 올린다.
--
-- 접근 규칙: 보기는 로그인 전원, 추가·수정·삭제는 관리자(owner)만.
-- ============================================================

create table if not exists recipe_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists recipes (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references recipe_categories(id) on delete cascade,
  name         text not null default '',
  ingredients  jsonb not null default '[]'::jsonb,   -- [{name, amount}]
  garnish      text not null default '',
  sauce        text not null default '',
  steps        jsonb not null default '[]'::jsonb,   -- string[]
  notes        jsonb not null default '[]'::jsonb,   -- string[]
  prep         jsonb not null default '[]'::jsonb,   -- [{name, detail}]
  photo_path   text not null default '',             -- storage 경로 (owner-center 버킷)
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_recipes_updated on recipes;
create trigger trg_recipes_updated before update on recipes
  for each row execute function touch_updated_at();

create index if not exists idx_recipes_cat on recipes (category_id, sort_order);
create index if not exists idx_recipe_categories_sort on recipe_categories (sort_order);

alter table recipe_categories enable row level security;
alter table recipes           enable row level security;

drop policy if exists recipe_categories_read on recipe_categories;
create policy recipe_categories_read on recipe_categories for select to authenticated using (true);
drop policy if exists recipe_categories_write on recipe_categories;
create policy recipe_categories_write on recipe_categories for all to authenticated
  using (is_owner()) with check (is_owner());

drop policy if exists recipes_read on recipes;
create policy recipes_read on recipes for select to authenticated using (true);
drop policy if exists recipes_write on recipes;
create policy recipes_write on recipes for all to authenticated
  using (is_owner()) with check (is_owner());

grant select, insert, update, delete on recipe_categories, recipes to authenticated;


-- ── 시드: PDF 원본 (이미 있으면 건너뜀) ──────────────────────
insert into recipe_categories (name, sort_order)
select v.name, v.sort
from (values
${categoryValues}
) v(name, sort)
where not exists (select 1 from recipe_categories);

insert into recipes (category_id, name, ingredients, garnish, sauce, steps, notes, prep, photo_path, sort_order)
select c.id, v.name, v.ingredients, v.garnish, v.sauce, v.steps, v.notes, v.prep, v.photo_path, v.sort_order
from (values
${recipeRows}
) v(cat, name, ingredients, garnish, sauce, steps, notes, prep, photo_path, sort_order)
join recipe_categories c on c.name = v.cat
where not exists (select 1 from recipes);


-- ── 확인 ─────────────────────────────────────────────────────
select c.name as 카테고리, count(r.id) as 메뉴수
from recipe_categories c left join recipes r on r.category_id = c.id
group by c.name, c.sort_order order by c.sort_order;
`

const outPath = path.resolve(__dirname, '../supabase/migrations/023_recipes.sql')
fs.writeFileSync(outPath, sqlText, 'utf-8')
console.log(`생성됨: ${outPath} (카테고리 ${SEED_CATEGORIES.length}개, 레시피 ${SEED_RECIPES.length}개)`)
