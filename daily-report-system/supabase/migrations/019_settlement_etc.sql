-- ============================================================
-- 019_settlement_etc.sql — 월정산에 "특이사항 및 기타" 카테고리 추가
--
-- 월정산 맨 아래에 이번 달 특이사항 금액을 따로 적는 칸(etc)을 둔다.
-- settlement_items.category 체크 제약에 'etc' 를 더한다.
--
-- 018 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================

alter table settlement_items drop constraint if exists settlement_items_category_check;

alter table settlement_items add constraint settlement_items_category_check
  check (category in (
    'labor_staff',  -- 인건비 · 직원
    'labor_part',   -- 인건비 · 알바
    'food',         -- 식자재 비용
    'marketing',    -- 마케팅 및 기타
    'fixed',        -- 고정비용
    'etc'           -- 특이사항 및 기타
  ));

-- ── 확인 ─────────────────────────────────────────────────────
select conname from pg_constraint
where conrelid = 'settlement_items'::regclass and contype = 'c';
