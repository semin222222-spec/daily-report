-- ============================================================
-- 009_store_branch.sql — 매장에 지점명 추가
--
-- 008 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
--
-- 로그인 화면에서 "본점 / 가맹" 대신 "을지로점 / 연남점" 처럼
-- 실제 지점 이름을 보여주기 위한 항목이다.
-- ============================================================

alter table stores add column if not exists branch text not null default '';

-- 알려주신 지점명 채우기. 이미 값이 있으면 건드리지 않는다.
update stores set branch = '을지로점' where tag = 'bbiddak' and branch = '';
update stores set branch = '연남점'   where tag = 'woosam'  and branch = '';

-- 쑥고개는 지점명을 모르니 비워둔다.
-- 설정 → 매장 관리에서 직접 입력하면 된다. (비어 있으면 매장 이름만 나온다)


-- ── 확인 ─────────────────────────────────────────────────────
select name as 매장, branch as 지점명, tag
from stores
order by sort_order;
