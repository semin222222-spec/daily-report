-- ============================================================
-- 010_reset_demo_data.sql — 데모/시드 데이터 전체 초기화
--
-- 실제 운영을 시작하기 전에 003_seed.sql 로 넣었던 가짜 데이터를 비운다.
--
-- 지우는 것:
--   일마감 · 직원 · 할일 · 리뷰 · 근무스케줄 · 월정산 · 점장보고서
--   고정비 금액 · 월 매출 목표
--
-- 남기는 것:
--   매장 3곳 (삐딱 / 우삼집 / 쑥고개)
--   계정과 권한 (profiles, auth.users)
--   목표 원가율 33% · 인건비율 20% · 영업일수 30일
--     → 0으로 두면 원가율 판정과 BEP 계산이 무의미해져서 기본값을 유지한다
--
-- ⚠️ 되돌릴 수 없다.
-- ============================================================

-- 자식 테이블부터 (FK cascade가 있지만 순서를 명시해 둔다)
delete from settlement_items;
delete from monthly_settlements;
delete from manager_reports;
delete from shifts;
delete from schedule_days;
delete from todos;
delete from reviews;
delete from daily_closings;
delete from staff;

-- 고정비 0원으로
update fixed_costs
   set rent = 0, mgmt = 0, utility = 0, insurance_etc = 0;

-- 월 매출 목표만 0으로, 기준 비율은 쓸 만한 기본값 유지
update store_settings
   set monthly_goal = 0,
       target_cost_rate = 33,
       target_labor_rate = 20,
       business_days = 30;


-- ── 확인 ─────────────────────────────────────────────────────
-- 모든 건수가 0이면 성공. 매장은 3으로 남아 있어야 한다.
select
  (select count(*) from daily_closings)      as 일마감,
  (select count(*) from staff)               as 직원,
  (select count(*) from todos)               as 할일,
  (select count(*) from reviews)             as 리뷰,
  (select count(*) from shifts)              as 스케줄,
  (select count(*) from monthly_settlements) as 월정산,
  (select count(*) from manager_reports)     as 점장보고서,
  (select count(*) from stores)              as 매장,
  (select count(*) from profiles)            as 계정;
