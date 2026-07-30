-- ============================================================
-- 018_meeting_notes.sql — 임원전용 회의록
--
-- 임원전용 메뉴 안의 "회의록" 카테고리. 회의 내용을 기록하고,
-- 수정·저장하면 최종수정일이 자동으로 찍힌다.
--
-- 017 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
--
-- 접근: 임원전용 메뉴 자체가 권한으로 막혀 있으므로, DB에서는
-- 로그인 전원 읽기 허용 + 오너만 쓰기로 둔다.
-- ============================================================

create table if not exists meeting_notes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null default '',
  meeting_date date,                              -- 회의 날짜 (직접 지정)
  attendees    text not null default '',          -- 참석자
  body         text not null default '',          -- 회의 내용
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now() -- 최종수정일 (자동)
);

create index if not exists idx_meeting_notes_date
  on meeting_notes (meeting_date desc, created_at desc);

-- 최종수정일 자동 갱신
drop trigger if exists trg_meeting_notes_updated on meeting_notes;
create trigger trg_meeting_notes_updated before update on meeting_notes
  for each row execute function touch_updated_at();

alter table meeting_notes enable row level security;

drop policy if exists meeting_notes_read on meeting_notes;
create policy meeting_notes_read on meeting_notes for select to authenticated
  using (true);

drop policy if exists meeting_notes_write on meeting_notes;
create policy meeting_notes_write on meeting_notes for all to authenticated
  using (is_owner()) with check (is_owner());

grant select, insert, update, delete on meeting_notes to authenticated;


-- ── 확인 ─────────────────────────────────────────────────────
select count(*) as 회의록 from meeting_notes;
