-- ============================================================
-- 027_setup_checklists.sql — 점주센터 · 가맹점 셋팅 체크리스트
--
-- 가맹점 하나 = 체크리스트 한 장(setup_checklists).
-- 항목(setup_checklist_items)은 매장마다 더하고 지울 수 있다.
-- 표준 항목은 코드(lib/setup-checklist.ts)에 있고, 새로 만들 때 복사해 넣는다.
--
-- 접근: 점주센터 규칙과 같다(앱에서 PIN 잠금) — 로그인 사용자 모두 읽고 쓴다.
--        체크리스트 한 장을 통째로 지우는 것만 오너.
--
-- 026 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================

create table if not exists setup_checklists (
  id          uuid primary key default gen_random_uuid(),
  store_name  text not null default '',            -- '삐딱 홍대점'
  open_date   date,                                -- 오픈 예정일
  memo        text not null default '',
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists setup_checklist_items (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references setup_checklists(id) on delete cascade,
  section       text not null default '추가 체크사항',   -- '인테리어 & 설비' …
  title         text not null default '',
  note          text not null default '',
  done          boolean not null default false,
  done_at       timestamptz,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_setup_items_list
  on setup_checklist_items (checklist_id, sort_order);

drop trigger if exists trg_setup_checklists_updated on setup_checklists;
create trigger trg_setup_checklists_updated before update on setup_checklists
  for each row execute function touch_updated_at();

drop trigger if exists trg_setup_items_updated on setup_checklist_items;
create trigger trg_setup_items_updated before update on setup_checklist_items
  for each row execute function touch_updated_at();

alter table setup_checklists      enable row level security;
alter table setup_checklist_items enable row level security;

drop policy if exists setup_checklists_read on setup_checklists;
create policy setup_checklists_read on setup_checklists for select to authenticated
  using (true);

drop policy if exists setup_checklists_insert on setup_checklists;
create policy setup_checklists_insert on setup_checklists for insert to authenticated
  with check (true);

drop policy if exists setup_checklists_update on setup_checklists;
create policy setup_checklists_update on setup_checklists for update to authenticated
  using (true) with check (true);

drop policy if exists setup_checklists_delete on setup_checklists;
create policy setup_checklists_delete on setup_checklists for delete to authenticated
  using (is_owner());

drop policy if exists setup_items_all on setup_checklist_items;
create policy setup_items_all on setup_checklist_items for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on
  setup_checklists, setup_checklist_items to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────
select count(*) as 셋팅체크리스트 from setup_checklists;
