-- 레시피에 조리 영상 1개를 붙인다.
-- 파일은 owner-center 버킷의 recipe-videos/ 아래에 저장되고(기존 점주센터 Storage 정책 그대로 적용),
-- 여기에는 그 경로만 담는다. 빈 문자열이면 영상 없음.
alter table recipes
  add column if not exists video_path text not null default '';
