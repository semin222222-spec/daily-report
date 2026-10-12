-- ============================================================
-- 024_equip_orders.sql — 임원전용 · 주방 집기 발주리스트
--
-- 가맹점 오픈 때마다 집기 업체(길흥주방 등)에서 받는 견적서를
-- "발주서 한 건"으로 저장한다.
--   equip_orders       = 견적서/발주서 한 장 (업체·작성일·매장)
--   equip_order_items  = 그 안의 품목 한 줄 (품명·규격·수량·단가)
--
-- 금액(수량×단가)·합계·부가세·총계는 저장하지 않고 화면에서 계산한다.
-- 단가는 부가세 별도(공급가)로 적는다.
--
-- 다음 오픈 때 업체가 보낸 엑셀을 올리면 화면이 지난 발주서와 비교해
-- 누락·신규·단가 변동을 보여주고, 확인 후 새 발주서로 저장한다.
--
-- 023 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- 접근: 회의록·오픈 체크리스트와 같은 규칙 — 로그인 사용자 읽기, 오너만 쓰기.
-- ============================================================

create table if not exists equip_orders (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null default '',          -- '홍대점 오픈 집기'
  vendor             text not null default '',          -- '길흥주방'
  quote_date         date,                              -- 견적서 작성일
  status             text not null default 'quote'
                       check (status in ('quote','ordered','delivered')),
  -- 어느 매장 오픈 건의 발주인지 (선택)
  open_checklist_id  uuid references open_checklists(id) on delete set null,
  memo               text not null default '',
  created_by         uuid references profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists equip_order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references equip_orders(id) on delete cascade,
  section     text not null default '주방 기물',       -- '주방 기물' / '홀 기물' …
  name        text not null default '',                -- 품명
  spec        text not null default '',                -- 규격
  qty         numeric not null default 0,              -- 수량
  unit_price  bigint not null default 0,               -- 단가 (부가세 별도)
  note        text not null default '',                -- 비고 (견적서의 '단위' 칸)
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_equip_items_order
  on equip_order_items (order_id, sort_order);

drop trigger if exists trg_equip_orders_updated on equip_orders;
create trigger trg_equip_orders_updated before update on equip_orders
  for each row execute function touch_updated_at();

drop trigger if exists trg_equip_items_updated on equip_order_items;
create trigger trg_equip_items_updated before update on equip_order_items
  for each row execute function touch_updated_at();

alter table equip_orders      enable row level security;
alter table equip_order_items enable row level security;

drop policy if exists equip_orders_read on equip_orders;
create policy equip_orders_read on equip_orders for select to authenticated
  using (true);

drop policy if exists equip_orders_write on equip_orders;
create policy equip_orders_write on equip_orders for all to authenticated
  using (is_owner()) with check (is_owner());

drop policy if exists equip_items_read on equip_order_items;
create policy equip_items_read on equip_order_items for select to authenticated
  using (true);

drop policy if exists equip_items_write on equip_order_items;
create policy equip_items_write on equip_order_items for all to authenticated
  using (is_owner()) with check (is_owner());

grant select, insert, update, delete on
  equip_orders, equip_order_items to authenticated;


-- ── 시드: 길흥주방 견적서 (2026-09-21, 63품목) ─────────────────
-- 발주서가 하나도 없을 때만 넣는다.
with o as (
  insert into equip_orders (title, vendor, quote_date, status, memo)
  select '기본 오픈 집기 (길흥주방 견적)', '길흥주방', date '2026-09-21', 'quote',
         '작성자 송우석 · HP 010-2377-0207 · FAX 02)778-1122 · 교환/반품 입고일부터 7일 이내 · 세금계산서 익월 10일 마감'
  where not exists (select 1 from equip_orders)
  returning id
)
insert into equip_order_items (order_id, section, name, spec, qty, unit_price, note, sort_order)
select o.id, v.section, v.name, v.spec, v.qty, v.price, v.note, v.ord
from o, (values
  ('주방 기물','엑스칼리버 후라이팬','11"',4,27000,'',1),
  ('주방 기물','후라이팬','40cm',1,35000,'',2),
  ('주방 기물','BMP','12cm',1,3600,'',3),
  ('주방 기물','BMP','22cm',4,9400,'',4),
  ('주방 기물','아이스크림스쿱','10호',2,7000,'',5),
  ('주방 기물','스텐 밧트','6 1/2',6,11500,'',6),
  ('주방 기물','스텐 밧트 커버','1/2',4,4500,'',7),
  ('주방 기물','PC 밧트','6 1/2',4,5000,'',8),
  ('주방 기물','스텐 밧트','풀',2,18500,'',9),
  ('주방 기물','스텐 밧트','6 1/3',20,10000,'',10),
  ('주방 기물','스텐 밧트 커버','1/3',5,3500,'',11),
  ('주방 기물','스텐 밧트','6 1/6',25,5800,'',12),
  ('주방 기물','스텐 밧트 커버','1/6',6,2700,'',13),
  ('주방 기물','PC 밧트','6 1/6',10,2200,'',14),
  ('주방 기물','PC 밧트 커버','1/6',4,1100,'',15),
  ('주방 기물','스텐 밧트','4 1/9',20,4200,'',16),
  ('주방 기물','스텐 밧트 커버','1/9',6,2000,'',17),
  ('주방 기물','PC 밧트','4 1/9',20,1800,'',18),
  ('주방 기물','PC 밧트 커버','1/9',6,950,'',19),
  ('주방 기물','전자저울','10',2,106000,'',20),
  ('주방 기물','프라스틱 비이커','2리터',2,5200,'',21),
  ('주방 기물','튀김 젓가락','',3,1000,'',22),
  ('주방 기물','염도계','기미상궁SB500',1,45000,'',23),
  ('주방 기물','주방 가위','',4,3900,'',24),
  ('주방 기물','주방 집계','30cm',5,2800,'',25),
  ('주방 기물','주방 집계','25cm',5,1800,'',26),
  ('주방 기물','휘퍼','33cm',1,8200,'',27),
  ('주방 기물','캔 오프너','',1,12000,'',28),
  ('주방 기물','마늘 손슬라이서','',1,24500,'',29),
  ('주방 기물','A/L 위생용기','8GL',1,43000,'',30),
  ('주방 기물','주방 도마','450*350/화이트,레드,그린',3,19000,'',31),
  ('주방 기물','주방 도마','미니/37*21',1,15500,'',32),
  ('주방 기물','주방 식도','야체용',2,10000,'',33),
  ('주방 기물','주방 식도','고기용 24cm',1,28500,'',34),
  ('주방 기물','주방 식도','미니',1,5000,'',35),
  ('주방 기물','믹싱볼','24cm/내22.5cm',2,2200,'',36),
  ('주방 기물','믹싱볼','30cm/내27cm',4,3700,'',37),
  ('주방 기물','믹싱볼','36cm/내34cm',4,5000,'',38),
  ('주방 기물','타공 믹싱볼','22.5cm/내20cm',1,5000,'',39),
  ('주방 기물','타공 믹싱볼','31.5cm/내29cm',2,7000,'',40),
  ('주방 기물','토치','주방용',1,10200,'',41),
  ('주방 기물','자루냄비','35cm',2,32000,'',42),
  ('홀 기물','돔접시','우디/220mm',35,39600,'',43),
  ('홀 기물','하이볼','16온즈',50,2200,'한진인쇄',44),
  ('홀 기물','인쇄비','',50,1450,'한진인쇄',45),
  ('홀 기물','세라믹 만능 전골','223mm',15,19000,'',46),
  ('홀 기물','세라믹 볼 전골','225mm',15,24500,'',47),
  ('홀 기물','올리브 접시','',5,8500,'',48),
  ('홀 기물','앞접시','130mm',150,4400,'',49),
  ('홀 기물','수저 셋트','아이보리',150,5500,'',50),
  ('홀 기물','유리 접시','90mm',55,1650,'',51),
  ('홀 기물','타원접시/노란 선그릇','250*200mm',15,23000,'',52),
  ('홀 기물','나무 받침','200mm',7,14500,'',53),
  ('홀 기물','그라탕 접시','205mm',7,13800,'',54),
  ('홀 기물','우드3구 소스 그릇 받침','',18,7700,'',55),
  ('홀 기물','유리 접시','190mm',25,2400,'',56),
  ('홀 기물','물병','1리터',30,4400,'',57),
  ('홀 기물','스텐 국자','3호',35,3000,'',58),
  ('홀 기물','피자 서버','올스텐',20,4950,'',59),
  ('홀 기물','디켄터','대',13,4900,'',60),
  ('홀 기물','유리 시럽기','소',15,3850,'',61),
  ('홀 기물','막걸리잔','',25,2750,'',62),
  ('홀 기물','양념통','70*85/그물망',1,4400,'',63)
) v(section, name, spec, qty, price, note, ord);


-- ── 확인 (합계 6,651,650 / 부가세 665,165 / 총계 7,316,815 이어야 한다) ──
select o.title as 발주서,
       count(i.id) as 품목수,
       sum(i.qty * i.unit_price) as 합계
from equip_orders o left join equip_order_items i on i.order_id = o.id
group by o.id, o.title;
