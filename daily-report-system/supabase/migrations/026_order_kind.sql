-- ============================================================
-- 026_order_kind.sql — 발주서 종류(주방 집기 / 쿠팡) 구분
--
-- 임원전용에서 「주방 집기 발주」와 「쿠팡 발주」를 탭으로 나눈다.
-- 이미 있는 발주서는 부가세 포함가(쿠팡)면 coupang, 아니면 equip.
--
-- 025 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================

alter table equip_orders add column if not exists kind text not null default 'equip';

alter table equip_orders drop constraint if exists equip_orders_kind_check;
alter table equip_orders add constraint equip_orders_kind_check
  check (kind in ('equip', 'coupang'));

update equip_orders set kind = 'coupang' where vat_included and kind <> 'coupang';


-- ── 확인 ─────────────────────────────────────────────────────
select kind as 종류, title as 발주서 from equip_orders order by kind, title;
