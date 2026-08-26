-- 사용자 프로필(가구 인원, 알레르기, 선호도 등) — AI 추천/생성에 반영됨
-- Supabase 대시보드의 SQL Editor에 이 파일 내용을 붙여넣고 실행하세요.

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_size integer not null default 2,
  allergies text not null default '',
  dislikes text not null default '',
  preferred_cuisines text not null default '',
  spice_level text not null default '보통',
  notes text not null default '',
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = user_id);
