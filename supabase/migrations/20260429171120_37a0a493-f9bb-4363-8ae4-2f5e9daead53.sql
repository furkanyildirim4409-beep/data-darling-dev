create table public.coach_notifications (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('order','compliance_alert','message','system')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  action_url text,
  created_at timestamptz not null default now()
);

create index idx_coach_notifications_feed
  on public.coach_notifications (coach_id, is_read, created_at desc);

alter table public.coach_notifications enable row level security;

create policy "Coaches read own notifications"
  on public.coach_notifications for select
  to authenticated
  using (coach_id = auth.uid());

create policy "Coaches update own notifications"
  on public.coach_notifications for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

alter table public.coach_notifications replica identity full;
alter publication supabase_realtime add table public.coach_notifications;