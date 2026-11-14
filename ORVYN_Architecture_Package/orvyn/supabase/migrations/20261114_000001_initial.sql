-- ORVYN initial PostgreSQL schema for a personal, single-owner workspace.
-- Target: Supabase PostgreSQL. Review and run with Supabase CLI migrations.
-- The app is not deployed; this file is a starter migration for the architecture.
begin;

create extension if not exists pgcrypto;

create or replace function public.touch_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if TG_TABLE_NAME in ('tasks', 'calendar_events') then
    new.version = old.version + 1;
  end if;
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Explorer' check (char_length(display_name) between 1 and 80),
  timezone text not null default 'UTC',
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A composite unique key prevents a user from linking to another user's data.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '',
  status text not null default 'active' check (status in ('planned','active','paused','completed','archived')),
  color text not null default '#7C9AFF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  status text not null default 'active' check (status in ('active','completed','paused','archived')),
  target_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null,
  title text not null check (char_length(title) between 1 and 200),
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  due_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (goal_id, user_id) references public.goals(id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid,
  milestone_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  status text not null default 'todo' check (status in ('todo','in_progress','done','archived')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  estimate_minutes integer check (estimate_minutes between 1 and 1440),
  due_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (project_id, user_id) references public.projects(id, user_id),
  foreign key (milestone_id, user_id) references public.milestones(id, user_id),
  check ((status = 'done') = (completed_at is not null))
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  event_type text not null default 'personal' check (event_type in ('personal','meeting','task_block','break')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (task_id, user_id) references public.tasks(id, user_id),
  check (ends_at > starts_at)
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds between 0 and 86400),
  mode text not null default 'focus' check (mode in ('focus','short_break','long_break')),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (task_id, user_id) references public.tasks(id, user_id),
  check (ended_at is null or ended_at >= started_at)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid,
  title text not null default 'Untitled' check (char_length(title) between 1 and 240),
  content jsonb not null default '{}'::jsonb,
  plain_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (project_id, user_id) references public.projects(id, user_id)
);

create table public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  widget_type text not null check (widget_type in ('tasks','goals','focus','calendar','momentum','notes','assistant')),
  config jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  width text not null default 'half' check (width in ('full','half','third')),
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Automation rules are configuration data, never executable SQL or arbitrary code.
create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  trigger_type text not null check (trigger_type in ('scheduled','task_completed','task_overdue','weekly_review')),
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  enabled boolean not null default false,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rule_id uuid not null,
  status text not null check (status in ('running','success','failed','skipped')),
  idempotency_key text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (rule_id, idempotency_key),
  foreign key (rule_id, user_id) references public.automation_rules(id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('reminder','deadline','system','automation')),
  title text not null,
  body text not null default '',
  destination_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Only trusted server operations write messages to prevent role spoofing.
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id) references public.ai_conversations(id, user_id)
);

-- Frequently used filters, joins, and RLS user ownership columns.
create index projects_user_status_idx on public.projects(user_id, status);
create index goals_user_status_idx on public.goals(user_id, status);
create index milestones_user_goal_idx on public.milestones(user_id, goal_id, sort_order);
create index tasks_user_status_due_idx on public.tasks(user_id, status, due_at);
create index tasks_user_project_idx on public.tasks(user_id, project_id);
create index tasks_user_milestone_idx on public.tasks(user_id, milestone_id);
create index calendar_events_user_starts_idx on public.calendar_events(user_id, starts_at);
create index calendar_events_user_task_idx on public.calendar_events(user_id, task_id);
create index focus_sessions_user_started_idx on public.focus_sessions(user_id, started_at desc);
create index notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index dashboard_widgets_user_position_idx on public.dashboard_widgets(user_id, position);
create index automation_rules_user_due_idx on public.automation_rules(user_id, enabled, next_run_at);
create index automation_runs_user_created_idx on public.automation_runs(user_id, created_at desc);
create index notifications_user_read_idx on public.notifications(user_id, read_at, created_at desc);
create index activity_events_user_created_idx on public.activity_events(user_id, created_at desc);
create index ai_conversations_user_updated_idx on public.ai_conversations(user_id, updated_at desc);
create index ai_messages_user_conversation_idx on public.ai_messages(user_id, conversation_id, created_at);

-- Updated-at triggers. Only tasks and calendar events also increment version.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'profiles','projects','goals','milestones','tasks','calendar_events',
    'notes','dashboard_widgets','automation_rules','ai_conversations'
  ] loop
    execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_row()', tbl, tbl);
  end loop;
end $$;

-- Automatically create a profile when Supabase Auth creates the user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data ->> 'display_name', 80), ''), 'Explorer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Base privileges: no anonymous table access; apply RLS in addition to grants.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'profiles','projects','goals','milestones','tasks','calendar_events',
    'focus_sessions','notes','dashboard_widgets','automation_rules',
    'automation_runs','notifications','activity_events','ai_conversations','ai_messages'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on table public.%I from anon, authenticated', tbl);
  end loop;
end $$;

grant select, update (display_name, timezone, theme, week_starts_on)
  on public.profiles to authenticated;
create policy profiles_read_self on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- User-controlled tables: CRUD for the owner only.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'projects','goals','milestones','tasks','calendar_events',
    'focus_sessions','notes','dashboard_widgets','automation_rules','ai_conversations'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      tbl || '_read_self', tbl
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      tbl || '_insert_self', tbl
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      tbl || '_update_self', tbl
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      tbl || '_delete_self', tbl
    );
  end loop;
end $$;

-- User can see trusted system output, but cannot forge notifications or audit data.
do $$
declare tbl text;
begin
  foreach tbl in array array['automation_runs','notifications','activity_events','ai_messages'] loop
    execute format('grant select on public.%I to authenticated', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      tbl || '_read_self', tbl
    );
  end loop;
end $$;

-- Allow marking notifications read without allowing edits to server-generated content.
grant update (read_at) on public.notifications to authenticated;
create policy notifications_mark_read_self on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
