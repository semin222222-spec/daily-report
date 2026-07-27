-- ============================================================
-- 016_owner_file_preview.sql — 파일 미리보기 이미지 경로
--
-- AI·PDF 파일을 올릴 때 브라우저에서 첫 페이지를 PNG로 만들어 함께
-- 저장한다. 그 미리보기 이미지의 storage 경로를 담는다.
--
-- 015 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
-- ============================================================

alter table oc_files add column if not exists preview_path text not null default '';


-- ── 확인 ─────────────────────────────────────────────────────
select column_name from information_schema.columns
where table_name = 'oc_files' and column_name = 'preview_path';
