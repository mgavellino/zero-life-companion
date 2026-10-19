create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text, created_at timestamptz not null default now());
grant select, insert, update on public.profiles to authenticated; grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated using (auth.uid()=id) with check (auth.uid()=id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1))) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.threads (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), title text not null default 'Nova conversa', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.messages (id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.threads(id) on delete cascade, user_id uuid not null default auth.uid(), role text not null, parts jsonb not null, created_at timestamptz not null default now());
create table public.memories (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), content text not null, created_at timestamptz not null default now());
create table public.tasks (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), title text not null, due_at timestamptz, minutes int, priority text not null default 'media', done boolean not null default false, created_at timestamptz not null default now());
create table public.transactions (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), kind text not null default 'expense', amount numeric(12,2) not null, category text not null default 'outros', description text, occurred_on date not null default current_date, created_at timestamptz not null default now());
create table public.budgets (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), category text not null, monthly_limit numeric(12,2) not null, unique(user_id, category));
create table public.meals (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), name text not null, meal_type text not null default 'almoco', calories int not null default 0, protein numeric not null default 0, carbs numeric not null default 0, fat numeric not null default 0, eaten_on date not null default current_date, created_at timestamptz not null default now());
create table public.workouts (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), name text not null, notes text, created_at timestamptz not null default now());
create table public.workout_exercises (id uuid primary key default gen_random_uuid(), workout_id uuid not null references public.workouts(id) on delete cascade, user_id uuid not null default auth.uid(), exercise_id text, name text not null, gif_url text, target text, sets int not null default 3, reps text not null default '10', rest_seconds int not null default 60, weight text, position int not null default 0, created_at timestamptz not null default now());

do $$ declare t text; begin
foreach t in array array['threads','messages','memories','tasks','transactions','budgets','meals','workouts','workout_exercises'] loop
 execute format('grant select, insert, update, delete on public.%I to authenticated; grant all on public.%I to service_role; alter table public.%I enable row level security; create policy "own rows" on public.%I for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);', t,t,t,t);
end loop; end $$;
create index on public.messages(thread_id, created_at);