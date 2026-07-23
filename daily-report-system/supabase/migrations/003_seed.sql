-- ============================================================
-- 003_seed.sql — 매장 · 샘플 데이터
--
-- 001_schema.sql, 002_rls.sql 실행 후에 돌린다.
-- 계정 연결은 004_accounts.sql 에서 따로 한다.
--
-- ⚠️ 파일을 나눈 이유:
--    Supabase SQL Editor는 스크립트 전체를 한 트랜잭션으로 실행한다.
--    맨 뒤 한 줄이 실패하면 앞의 성공한 insert까지 전부 롤백된다.
--    그래서 "데이터"와 "계정"을 분리했다. 하나가 실패해도 다른 하나는 남는다.
--
-- 여러 번 실행해도 안전하다.
-- ============================================================

-- ── 매장 3개 ─────────────────────────────────────────────────
-- fixed_costs / store_settings 행은 001의 트리거가 자동 생성한다.
insert into stores (name, tag, color, badge, kind, sort_order) values
  ('삐딱',   'bbiddak', '#f0542d', '삐', 'main',      1),
  ('우삼집', 'woosam',  '#d98324', '우', 'franchise', 2),
  ('쑥고개', 'ssuk',    '#4b7f52', '쑥', 'franchise', 3)
on conflict (tag) do update
  set name = excluded.name,
      color = excluded.color,
      badge = excluded.badge,
      kind = excluded.kind,
      sort_order = excluded.sort_order;

-- ── 고정비 ───────────────────────────────────────────────────
insert into fixed_costs (store_id, rent, mgmt, utility, insurance_etc)
select s.id, v.rent, v.mgmt, v.utility, v.etc
from (values
  ('bbiddak', 8000000, 1200000, 2400000, 900000),
  ('woosam',  5500000,  900000, 1700000, 600000),
  ('ssuk',    4200000,  700000, 1300000, 500000)
) as v(tag, rent, mgmt, utility, etc)
join stores s on s.tag = v.tag
on conflict (store_id) do update
  set rent = excluded.rent,
      mgmt = excluded.mgmt,
      utility = excluded.utility,
      insurance_etc = excluded.insurance_etc;

-- ── 월 목표 · 기준 ───────────────────────────────────────────
insert into store_settings (store_id, monthly_goal, target_cost_rate, target_labor_rate, business_days)
select s.id, v.goal, 33, 20, 30
from (values
  ('bbiddak', 150000000),
  ('woosam',   95000000),
  ('ssuk',     62000000)
) as v(tag, goal)
join stores s on s.tag = v.tag
on conflict (store_id) do update
  set monthly_goal = excluded.monthly_goal;

-- ── 직원 ─────────────────────────────────────────────────────
-- 이미 직원이 있는 매장은 건너뛴다(실수로 덮어쓰지 않게).
insert into staff (store_id, name, position, pay_type, rate, work_hours)
select s.id, v.name, v.position, v.pay_type, v.rate, v.hours
from (values
  ('bbiddak', '김정민', '주방', 'monthly', 2600000,   0),
  ('bbiddak', '이서준', '홀',   'hourly',    11000, 180),
  ('bbiddak', '박하나', '홀',   'hourly',    10500, 120),
  ('woosam',  '최윤',   '주방', 'monthly', 2500000,   0),
  ('woosam',  '정우',   '홀',   'hourly',    10500, 160),
  ('ssuk',    '한별',   '주방', 'monthly', 2400000,   0),
  ('ssuk',    '조은',   '홀',   'hourly',    10000, 140)
) as v(tag, name, position, pay_type, rate, hours)
join stores s on s.tag = v.tag
where not exists (select 1 from staff x where x.store_id = s.id);

-- ── 오늘 할일 ────────────────────────────────────────────────
insert into todos (store_id, text, assignee, done)
select s.id, v.text, v.assignee, v.done
from (values
  ('bbiddak', '홀 에어컨 필터 청소',    '홀',   false),
  ('bbiddak', '주류 재고 확인 후 발주', '주방', false),
  ('bbiddak', '포스 마감 정산',         '점장', true),
  ('woosam',  '신메뉴 시식 준비',       '주방', false),
  ('woosam',  '배달 리뷰 답글 달기',    '점장', false),
  ('ssuk',    '주차장 안내판 교체',     '홀',   false)
) as v(tag, text, assignee, done)
join stores s on s.tag = v.tag
where not exists (select 1 from todos x where x.store_id = s.id);

-- ── 리뷰 ─────────────────────────────────────────────────────
insert into reviews (store_id, source, author, rating, text, posted_at, is_new)
select s.id, v.source, v.author, v.rating, v.text,
       now() - (v.hours_ago || ' hours')::interval,
       v.hours_ago < 24
from (values
  ('bbiddak', 'naver', '김**', 5.0, '여기 삼겹살 진짜 미쳤어요… 사장님도 친절하고 재방문 각!', 0.2),
  ('bbiddak', 'kakao', '이**', 4.0, '분위기 좋고 맛있어요. 주차가 조금 아쉬웠어요.',            1.0),
  ('bbiddak', 'naver', '박**', 5.0, '단체로 갔는데 세팅 빠르고 좋았습니다.',                   26.0),
  ('woosam',  'naver', '최**', 5.0, '우삼집 국물 끝내줍니다. 또 올게요!',                       3.0),
  ('woosam',  'kakao', '정**', 3.0, '맛은 좋은데 웨이팅이 길어요.',                            27.0),
  ('ssuk',    'naver', '한**', 5.0, '쑥고개 조용하고 정갈해서 부모님 모시고 오기 좋아요.',       2.0)
) as v(tag, source, author, rating, text, hours_ago)
join stores s on s.tag = v.tag
where not exists (select 1 from reviews x where x.store_id = s.id);

-- ── 최근 35일 일마감 ─────────────────────────────────────────
-- 오늘은 일부러 비워둔다 → 일마감 화면의 "미입력" 표시를 확인하기 위해.
-- 요일별 배수(금·토 높고 월요일 낮음)와 약간의 랜덤을 섞어 실제처럼 보이게 만든다.
with cfg(tag, base, cost_rate, guests) as (
  values ('bbiddak', 4820000, 0.33, 214),
         ('woosam',  3140000, 0.36, 158),
         ('ssuk',    2010000, 0.34,  97)
),
days as (
  select
    st.id as store_id,
    g.d::date as date,
    c.base, c.cost_rate, c.guests,
    case extract(dow from g.d)
      when 0 then 0.95  -- 일
      when 1 then 0.78  -- 월
      when 2 then 0.84
      when 3 then 0.88
      when 4 then 0.97
      when 5 then 1.24  -- 금
      else        1.34  -- 토
    end as factor
  from stores st
  join cfg c on c.tag = st.tag
  cross join generate_series(
    (current_date - 35)::timestamp,
    (current_date - 1)::timestamp,
    interval '1 day'
  ) g(d)
),
calc as (
  select
    store_id, date, cost_rate,
    greatest(1, round(guests * factor * (0.94 + random() * 0.12))::int) as guests,
    (round(base * factor * (0.94 + random() * 0.12) / 1000) * 1000)::bigint as sales
  from days
),
split as (
  select
    store_id, date, guests, sales, cost_rate,
    (round(sales * 0.62 / 1000) * 1000)::bigint as card,
    (round(sales * 0.13 / 1000) * 1000)::bigint as cash,
    (round(sales * 0.21 / 1000) * 1000)::bigint as delivery
  from calc
)
insert into daily_closings
  (store_id, date, guests, sales_card, sales_cash, sales_delivery, sales_etc, cost, expense)
select
  store_id, date, guests,
  card, cash, delivery,
  sales - card - cash - delivery,
  (round(sales * cost_rate * (0.96 + random() * 0.08) / 1000) * 1000)::bigint,
  (round((30000 + random() * 90000) / 1000) * 1000)::bigint
from split
on conflict (store_id, date) do nothing;


-- ── 확인 ─────────────────────────────────────────────────────
-- 아래가 3행 나오면 성공.
select s.name as 매장, count(c.id) as 마감일수
from stores s
left join daily_closings c on c.store_id = s.id
group by s.name
order by s.name;
