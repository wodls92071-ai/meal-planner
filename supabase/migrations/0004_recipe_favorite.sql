-- 레시피 즐겨찾기 — AI 추천 시 우선적으로 재사용하는 데 사용
-- Supabase 대시보드의 SQL Editor에 이 파일 내용을 붙여넣고 실행하세요.

alter table recipes add column if not exists is_favorite boolean not null default false;
