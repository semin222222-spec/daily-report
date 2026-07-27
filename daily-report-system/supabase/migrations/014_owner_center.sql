-- ============================================================
-- 014_owner_center.sql — 점주센터 오픈발주 카테고리·품목 (DB화 + CRUD)
--
-- 지금까지 오픈발주 데이터는 코드 상수였다. 점주가 카테고리·품목을
-- 직접 추가·수정·삭제할 수 있게 DB로 옮긴다.
--
-- 013 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
--
-- 접근 규칙: 점주센터는 앱에서 PIN으로 잠근다. DB에서는 로그인한
-- 사용자(authenticated) 모두 읽고 쓸 수 있다(공용 마스터 자료).
-- ============================================================

create table if not exists oc_categories (
  id          uuid primary key default gen_random_uuid(),
  folder      text not null default 'open-order',  -- 미래 확장(운영매뉴얼 등)
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists oc_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references oc_categories(id) on delete cascade,
  name         text not null default '',
  spec         text not null default '',
  qty          text not null default '',
  unit         text not null default 'EA',
  -- 발주 관리 항목
  est_price    bigint not null default 0,                    -- 예상금액
  buy_price    bigint not null default 0,                    -- 실구매금액
  priority     text not null default '필수'
                 check (priority in ('필수','권장','선택')),   -- 필수여부
  status       text not null default '미구매'
                 check (status in ('미구매','구매중','구매완료','보류')), -- 구매상태
  manager      text not null default '',                     -- 담당
  vendor       text not null default '',                     -- 구매처
  link         text not null default '',                     -- 구매링크
  due_date     text not null default '',                     -- 입고예정일
  location     text not null default '',                     -- 설치/보관 위치
  note         text not null default '',                     -- 비고
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()            -- 최종수정일
);

-- 이미 만들어져 있던 경우에도 새 컬럼을 채워 넣는다 (재실행 안전)
alter table oc_items add column if not exists est_price bigint not null default 0;
alter table oc_items add column if not exists buy_price bigint not null default 0;
alter table oc_items add column if not exists priority text not null default '필수';
alter table oc_items add column if not exists status   text not null default '미구매';
alter table oc_items add column if not exists manager  text not null default '';
alter table oc_items add column if not exists vendor   text not null default '';
alter table oc_items add column if not exists link     text not null default '';
alter table oc_items add column if not exists due_date text not null default '';
alter table oc_items add column if not exists location text not null default '';
alter table oc_items add column if not exists note     text not null default '';
alter table oc_items add column if not exists updated_at timestamptz not null default now();

-- 최종수정일 자동 갱신 (touch_updated_at 함수는 001에서 만들어 둠)
drop trigger if exists trg_oc_items_updated on oc_items;
create trigger trg_oc_items_updated before update on oc_items
  for each row execute function touch_updated_at();

create index if not exists idx_oc_items_cat on oc_items (category_id, sort_order);
create index if not exists idx_oc_categories_folder on oc_categories (folder, sort_order);

alter table oc_categories enable row level security;
alter table oc_items      enable row level security;

drop policy if exists oc_categories_all on oc_categories;
create policy oc_categories_all on oc_categories for all to authenticated
  using (true) with check (true);

drop policy if exists oc_items_all on oc_items;
create policy oc_items_all on oc_items for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on oc_categories, oc_items to authenticated;


-- ── 시드: 엑셀 원본 (이미 있으면 건너뜀) ────────────────────
insert into oc_categories (folder, name, sort_order)
select 'open-order', v.name, v.ord
from (values
  ('주방 장비',1),('주방 기물',2),('식기류',3),('홀 비품',4),
  ('청소용품',5),('소모품',6),('포장재',7),('초도 식자재',8),('추가 구매 추천',9)
) v(name, ord)
where not exists (select 1 from oc_categories where folder = 'open-order');

insert into oc_items (category_id, name, spec, qty, unit, sort_order)
select c.id, v.name, v.spec, v.qty, v.unit, v.ord
from (values
  ('주방 장비','업소용 냉장고','1500 테이블형','2','EA',1),
  ('주방 장비','업소용 냉동고','박스형','1','EA',2),
  ('주방 장비','튀김기','가정용/업소용 확인','2','EA',3),
  ('주방 장비','식기세척기','','1','EA',4),
  ('주방 기물','스테인리스 믹싱볼','대/중/소','6','SET',1),
  ('주방 기물','집게','튀김/플레이팅','12','EA',2),
  ('주방 기물','칼/도마 세트','용도별 색상','1','SET',3),
  ('식기류','메인 접시','메뉴별 지정','30','EA',1),
  ('식기류','앞접시','','80','EA',2),
  ('식기류','수저 세트','','80','SET',3),
  ('홀 비품','테이블 번호판','','15','EA',1),
  ('홀 비품','웨이팅 안내물','','1','EA',2),
  ('홀 비품','무전기','','4','EA',3),
  ('청소용품','주방 세정제','','2','EA',1),
  ('청소용품','바닥 밀대','','3','EA',2),
  ('청소용품','고무장갑','','10','PAIR',3),
  ('소모품','키친타월','','12','ROLL',1),
  ('소모품','위생장갑','','20','BOX',2),
  ('소모품','포스 롤지','','10','ROLL',3),
  ('포장재','배달 용기','메인메뉴용','5','BOX',1),
  ('포장재','소스컵','','3','BOX',2),
  ('포장재','쇼핑백','','2','BOX',3),
  ('초도 식자재','수육 원육','본사 지정 규격','1','BOX',1),
  ('초도 식자재','김치','본사 지정','1','BOX',2),
  ('초도 식자재','소스류','초도 세트','1','SET',3)
) v(cat, name, spec, qty, unit, ord)
join oc_categories c on c.name = v.cat and c.folder = 'open-order'
where not exists (select 1 from oc_items);


-- ── 확인 ─────────────────────────────────────────────────────
select c.name as 카테고리, count(i.id) as 품목수
from oc_categories c left join oc_items i on i.category_id = c.id
where c.folder = 'open-order'
group by c.name, c.sort_order order by c.sort_order;
