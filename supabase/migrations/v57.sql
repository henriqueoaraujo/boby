-- Boby v57: corrige permissões e prioridades usadas pela sincronização.
-- Execute no SQL Editor do Supabase.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text,
  title text not null,
  notes text not null default '',
  priority text not null default 'normal',
  series_id uuid,
  original_due_date date,
  carried_at date,
  done boolean not null default false,
  due_date date not null default current_date,
  due_time time,
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks
add constraint tasks_priority_check check (priority in ('normal', 'high'));

alter table public.tasks add column if not exists series_id uuid;
alter table public.tasks add column if not exists original_due_date date;
alter table public.tasks add column if not exists carried_at date;

create unique index if not exists categories_user_name_key
on public.categories(user_id, name);

create index if not exists categories_user_position_idx
on public.categories(user_id, position);

create index if not exists tasks_user_position_idx
on public.tasks(user_id, position);

create index if not exists tasks_user_due_date_idx
on public.tasks(user_id, due_date);

alter table public.categories enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "Users can manage own categories" on public.categories;
drop policy if exists "Users can manage own tasks" on public.tasks;

create policy "Users can manage own categories"
on public.categories for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own tasks"
on public.tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
