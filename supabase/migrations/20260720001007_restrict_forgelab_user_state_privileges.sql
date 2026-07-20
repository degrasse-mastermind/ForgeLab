revoke all on table public.forgelab_user_state from anon, authenticated;

grant select, insert, update, delete
  on table public.forgelab_user_state
  to authenticated;
