-- ============================================================
-- 008_health_and_holiday.sql
--   ① 보건증 만료 관리
--   ② 직책을 직원 / 알바 두 가지로 정리
--   ③ 공휴일(빨간날) 표시
--
-- 007 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================


-- ── ② 직책: 직원 / 파트 / 파출 → 직원 / 알바 ────────────────
-- 기존 제약을 떼고 값을 정리한 뒤 새 제약을 건다.
alter table staff drop constraint if exists staff_emp_type_check;

update staff set emp_type = '알바' where emp_type in ('파트', '파출');
update staff set emp_type = '직원' where emp_type not in ('직원', '알바');

alter table staff alter column emp_type set default '직원';
alter table staff add constraint staff_emp_type_check
  check (emp_type in ('직원', '알바'));


-- ── ① 보건증 ────────────────────────────────────────────────
-- 발급일만 받는다. 만료일(발급일 + 1년)은 화면에서 계산해 보여준다.
-- 별도 테이블로 빼지 않은 이유: 사람당 한 건이고, 직원 명단과 수명이 같다.
alter table staff add column if not exists health_cert_issued date;
alter table staff add column if not exists health_cert_memo text not null default '';


-- ── ③ 공휴일 ────────────────────────────────────────────────
-- 스케줄표에서 날짜를 눌러 빨간날로 지정한다.
-- 대체공휴일·창립기념일 등 매장 사정도 여기에 담긴다.
alter table schedule_days add column if not exists is_holiday boolean not null default false;
alter table schedule_days add column if not exists holiday_name text not null default '';


-- ── 확인 ─────────────────────────────────────────────────────
select
  (select count(*) from staff where emp_type = '직원') as 직원수,
  (select count(*) from staff where emp_type = '알바') as 알바수,
  (select count(*) from information_schema.columns
     where table_name = 'staff' and column_name = 'health_cert_issued') as 보건증컬럼,
  (select count(*) from information_schema.columns
     where table_name = 'schedule_days' and column_name = 'is_holiday') as 공휴일컬럼;
