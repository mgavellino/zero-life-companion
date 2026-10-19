create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_subscriptions_user_id on public.subscriptions(user_id);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Users view own subscription" on public.subscriptions for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create or replace function public.has_active_subscription(user_uuid uuid, check_env text default 'live')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid and environment = check_env and (
      (status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now()))
      or (status = 'canceled' and current_period_end > now())
    )
  );
$$;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  kind text not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on public.notifications(user_id, created_at desc);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Own notifications select" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "Own notifications insert" on public.notifications for insert to authenticated with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Own notifications update" on public.notifications for update to authenticated using (auth.uid() = user_id);
create policy "Own notifications delete" on public.notifications for delete to authenticated using (auth.uid() = user_id);

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.subscriptions;

create policy "Admins read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));