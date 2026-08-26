-- meal-planner 초기 스키마
-- Supabase 대시보드의 SQL Editor에 이 파일 내용을 붙여넣고 실행하세요.

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  image_url text,
  ingredients jsonb not null default '[]',
  instructions jsonb not null default '[]',
  source text not null check (source in ('external', 'custom')),
  external_id text,
  created_at timestamptz not null default now()
);

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  recipe_id uuid not null references recipes(id) on delete cascade,
  servings numeric not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create index if not exists recipes_user_id_idx on recipes(user_id);
create index if not exists meal_plans_user_id_date_idx on meal_plans(user_id, date);
create index if not exists shopping_lists_user_id_week_idx
  on shopping_lists(user_id, week_start_date);

alter table recipes enable row level security;
alter table meal_plans enable row level security;
alter table shopping_lists enable row level security;

create policy "recipes: 본인 행만 조회" on recipes
  for select using (auth.uid() = user_id);
create policy "recipes: 본인 행만 추가" on recipes
  for insert with check (auth.uid() = user_id);
create policy "recipes: 본인 행만 수정" on recipes
  for update using (auth.uid() = user_id);
create policy "recipes: 본인 행만 삭제" on recipes
  for delete using (auth.uid() = user_id);

create policy "meal_plans: 본인 행만 조회" on meal_plans
  for select using (auth.uid() = user_id);
create policy "meal_plans: 본인 행만 추가" on meal_plans
  for insert with check (auth.uid() = user_id);
create policy "meal_plans: 본인 행만 수정" on meal_plans
  for update using (auth.uid() = user_id);
create policy "meal_plans: 본인 행만 삭제" on meal_plans
  for delete using (auth.uid() = user_id);

create policy "shopping_lists: 본인 행만 조회" on shopping_lists
  for select using (auth.uid() = user_id);
create policy "shopping_lists: 본인 행만 추가" on shopping_lists
  for insert with check (auth.uid() = user_id);
create policy "shopping_lists: 본인 행만 수정" on shopping_lists
  for update using (auth.uid() = user_id);
create policy "shopping_lists: 본인 행만 삭제" on shopping_lists
  for delete using (auth.uid() = user_id);
