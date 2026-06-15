-- Execute no SQL Editor do Supabase ao atualizar da v53 para a v54.

alter table public.tasks
add column if not exists priority text not null default 'normal';

alter table public.tasks
drop constraint if exists tasks_priority_check;

alter table public.tasks
add constraint tasks_priority_check
check (priority in ('low', 'normal', 'high'));
