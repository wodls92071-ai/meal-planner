-- 레시피 음식 카테고리 (국물요리/메인반찬/밑반찬/밥·면/디저트·간식/기타) — 레시피 목록 분류·필터에 사용
-- Supabase 대시보드의 SQL Editor에 이 파일 내용을 붙여넣고 실행하세요.

alter table recipes
  add column if not exists category text not null default '기타'
  check (category in ('국물요리', '메인반찬', '밑반찬', '밥/면', '디저트/간식', '기타'));
