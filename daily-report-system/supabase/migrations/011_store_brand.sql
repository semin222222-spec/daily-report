-- ============================================================
-- 011_store_brand.sql — 매장에 브랜드 추가
--
-- 010 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
--
-- 왜 필요한가:
--   "삐딱 을지로점"과 "삐딱 문래점"은 다른 매장이지만 같은 브랜드다.
--   지금은 로고 파일을 tag 기준(bbiddak.png)으로 찾기 때문에,
--   문래점을 추가하면 bbiddak-mullae.png 를 찾다가 없어서 폴백 배지가 뜬다.
--
--   brand 를 따로 두면 지점을 몇 개 만들든 로고 파일 하나(bbiddak.png)를
--   공유하고, 매장 컬러도 브랜드에서 그대로 물려받는다.
-- ============================================================

alter table stores add column if not exists brand text not null default '';

-- 기존 매장은 자기 tag 가 곧 브랜드였다
update stores set brand = tag where brand = '';

create index if not exists idx_stores_brand on stores (brand);


-- ── 확인 ─────────────────────────────────────────────────────
-- 브랜드별로 몇 개 지점이 있는지. 지금은 각 1개씩 나온다.
select brand as 브랜드, count(*) as 지점수,
       string_agg(name, ', ' order by sort_order) as 매장
from stores
group by brand
order by brand;
