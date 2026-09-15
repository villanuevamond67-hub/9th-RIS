-- Run this once in the Supabase SQL Editor.
create table if not exists public.ris_user_data (
    user_id uuid not null references auth.users(id) on delete cascade,
    storage_key text not null,
    value text not null default '',
    updated_at timestamptz not null default now(),
    primary key (user_id, storage_key)
);

alter table public.ris_user_data enable row level security;

drop policy if exists "Users can read their RIS data" on public.ris_user_data;
create policy "Users can read their RIS data"
on public.ris_user_data for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their RIS data" on public.ris_user_data;
create policy "Users can insert their RIS data"
on public.ris_user_data for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their RIS data" on public.ris_user_data;
create policy "Users can update their RIS data"
on public.ris_user_data for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their RIS data" on public.ris_user_data;
create policy "Users can delete their RIS data"
on public.ris_user_data for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Include the table in Supabase Realtime so open RIS tabs refresh automatically.
do $$
begin
    alter publication supabase_realtime add table public.ris_user_data;
exception
    when duplicate_object then null;
end $$;
