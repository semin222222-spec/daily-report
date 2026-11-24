-- 점주센터 자료실: 분류(카테고리)와 목록용 작은 썸네일.
--
-- category   : 폴더 안의 세부 분류 (예: 디자인 → 로고·간판·포스터…). 빈 문자열이면 '미분류'.
-- thumb_path : 목록에 보이는 작은 JPEG(긴 변 320px). 원본 사진(10~48MB)을 목록에서
--              그대로 불러와 썸네일이 늦게 뜨거나 안 뜨던 문제를 막는다.
--              preview_path(AI·PDF 첫 페이지 PNG)는 미리보기 창용으로 그대로 둔다.
alter table oc_files add column if not exists category   text not null default '';
alter table oc_files add column if not exists thumb_path text not null default '';

-- 디자인 폴더 기존 파일 분류
update oc_files set category = case
  when name ~ '시트지' then '시트지'
  when name ~ '티오더' then '티오더 화면'
  when name ~ '^메뉴사진' then '메뉴 사진'
  when name ~ '(티셔츠|냅킨|종이컵)' then '굿즈·소모품'
  when name ~ '간판' then '간판'
  when name ~ '포스터' then '포스터'
  when name ~ '(로고|프로필)' then '로고'
  else category
end
where folder = 'design' and category = '';
