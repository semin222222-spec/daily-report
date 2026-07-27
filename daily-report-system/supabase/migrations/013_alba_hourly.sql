-- ============================================================
-- 013_alba_hourly.sql — 알바 인건비를 시급 × 시간으로
--
-- 직원은 월급 고정(금액 한 칸)이고, 알바는 시급 × 근무시간으로 계산한다.
-- settlement_items 에 시급(rate)·시간(hours) 칸을 더한다.
-- 알바(labor_part) 행은 amount = rate * hours 로 저장한다.
--
-- 012 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================

alter table settlement_items add column if not exists rate  bigint  not null default 0;
alter table settlement_items add column if not exists hours numeric(6,1) not null default 0;


-- ── 확인 ─────────────────────────────────────────────────────
select column_name, data_type
from information_schema.columns
where table_name = 'settlement_items'
  and column_name in ('rate', 'hours')
order by column_name;
