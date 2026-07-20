create table public.forgelab_user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forgelab_user_state_state_is_object
    check (jsonb_typeof(state) = 'object')
);

alter table public.forgelab_user_state enable row level security;

revoke all on table public.forgelab_user_state from anon;
grant select, insert, update, delete
  on table public.forgelab_user_state
  to authenticated;

create policy "Users can read their own ForgeLab state"
  on public.forgelab_user_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own ForgeLab state"
  on public.forgelab_user_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own ForgeLab state"
  on public.forgelab_user_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own ForgeLab state"
  on public.forgelab_user_state
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.forgelab_user_state is
  'One synchronized ForgeLab application state document per authenticated user.';
