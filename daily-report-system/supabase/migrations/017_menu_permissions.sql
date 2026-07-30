-- ============================================================
-- 017_menu_permissions.sql — 계정별 메뉴 권한
--
-- 관리자(owner)가 점장 계정마다 메뉴별 권한을 준다.
--   숨김(hidden)   — 메뉴가 안 보이고 페이지도 막힘
--   조회만(view)   — 보기만, 저장·수정·삭제 불가
--   수정가능(edit) — 등록·수정·삭제까지 (기본값)
--
-- profiles.permissions 에 { "메뉴키": "hidden|view|edit" } 형태로 담는다.
-- 키가 없으면 edit 로 본다(기존 점장은 전부 수정가능 유지).
--
-- 016 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================

alter table profiles
  add column if not exists permissions jsonb not null default '{}'::jsonb;


-- ── 확인 ─────────────────────────────────────────────────────
select login_id, role, permissions from profiles order by role, login_id;
