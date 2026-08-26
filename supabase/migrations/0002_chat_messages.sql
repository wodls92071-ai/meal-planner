-- AI 채팅(/assistant) 대화 기록 저장용 테이블
-- Supabase 대시보드의 SQL Editor에 이 파일 내용을 붙여넣고 실행하세요.

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  role text not null check (role in ('user', 'model')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_week_idx
  on chat_messages(user_id, week_start_date, created_at);

alter table chat_messages enable row level security;

create policy "chat_messages_select_own" on chat_messages
  for select using (auth.uid() = user_id);
create policy "chat_messages_insert_own" on chat_messages
  for insert with check (auth.uid() = user_id);
