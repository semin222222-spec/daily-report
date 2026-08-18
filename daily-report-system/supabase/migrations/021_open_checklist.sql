-- ============================================================
-- 021_open_checklist.sql — 임원전용 · 매장 오픈 체크리스트
--
-- 매장을 하나 열 때마다 "오픈 건" 하나를 만들고, 그 안에 단계별
-- 할 일(계약·공사·장비·인력·마케팅…)을 쌓는다. 다음 매장을 열 때는
-- 지난 오픈 건을 통째로 복사해 쓰면 되므로 과정이 자산으로 남는다.
--
-- 점주센터의 [오픈 발주]와 역할이 다르다.
--   오픈 발주   = 브랜드 공통 품목 마스터 (무엇을 사는가)
--   오픈 체크리스트 = 매장 한 곳의 오픈 진행 상황 (언제 누가 어디까지)
--
-- 020 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
--
-- 접근: 임원전용 메뉴가 권한으로 막혀 있으므로 회의록과 같은 규칙 —
-- 로그인 전원 읽기, 오너만 쓰기.
-- ============================================================

-- 오픈 건 (= 매장 하나의 오픈 프로젝트)
create table if not exists open_checklists (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',          -- '삐딱 홍대점'
  open_date   date,                              -- 오픈 예정일 (D-day 계산)
  status      text not null default 'preparing'
                check (status in ('preparing','opened','onhold')),
  memo        text not null default '',
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 체크리스트 한 줄
create table if not exists open_checklist_tasks (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references open_checklists(id) on delete cascade,
  -- 단계. 코드의 OPEN_SECTIONS 와 맞추지만, 자유 입력도 허용한다.
  section       text not null default '기타',
  title         text not null default '',
  owner         text not null default '',        -- 담당
  due_date      text not null default '',        -- 'YYYY-MM-DD' 또는 빈 문자열
  cost          bigint not null default 0,       -- 예상 비용
  vendor        text not null default '',        -- 업체 · 구매처
  memo          text not null default '',
  done          boolean not null default false,
  done_at       timestamptz,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_open_tasks_list
  on open_checklist_tasks (checklist_id, sort_order);

drop trigger if exists trg_open_checklists_updated on open_checklists;
create trigger trg_open_checklists_updated before update on open_checklists
  for each row execute function touch_updated_at();

drop trigger if exists trg_open_tasks_updated on open_checklist_tasks;
create trigger trg_open_tasks_updated before update on open_checklist_tasks
  for each row execute function touch_updated_at();

alter table open_checklists      enable row level security;
alter table open_checklist_tasks enable row level security;

drop policy if exists open_checklists_read on open_checklists;
create policy open_checklists_read on open_checklists for select to authenticated
  using (true);

drop policy if exists open_checklists_write on open_checklists;
create policy open_checklists_write on open_checklists for all to authenticated
  using (is_owner()) with check (is_owner());

drop policy if exists open_tasks_read on open_checklist_tasks;
create policy open_tasks_read on open_checklist_tasks for select to authenticated
  using (true);

drop policy if exists open_tasks_write on open_checklist_tasks;
create policy open_tasks_write on open_checklist_tasks for all to authenticated
  using (is_owner()) with check (is_owner());

grant select, insert, update, delete on
  open_checklists, open_checklist_tasks to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────
select count(*) as 오픈건 from open_checklists;
