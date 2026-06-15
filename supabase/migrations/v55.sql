-- Execute no SQL Editor do Supabase ao atualizar da v54 para a v55.

alter table public.tasks add column if not exists series_id uuid;
alter table public.tasks add column if not exists original_due_date date;
alter table public.tasks add column if not exists carried_at date;

update public.tasks
set due_date = current_date
where due_date is null;

alter table public.tasks
alter column due_date set default current_date;

alter table public.tasks
alter column due_date set not null;
