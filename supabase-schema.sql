-- Ejecuta TODO este archivo en Supabase > SQL Editor.
-- La tabla advent_admins controla quién puede administrar. No se permite
-- que un usuario se convierta a sí mismo en administrador.

create table if not exists public.advent_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.advent_settings (
  id integer primary key check (id = 1),
  title text not null default '24 días de sorpresas para Francis',
  start_date date not null default '2026-12-01',
  timezone text not null default 'America/Asuncion'
);
insert into public.advent_settings(id) values (1) on conflict do nothing;

create table if not exists public.advent_gifts (
  id uuid primary key default gen_random_uuid(),
  day integer not null unique check (day between 1 and 24),
  unlock_date date not null,
  title text not null default 'Una sorpresa para ti',
  message text not null default '',
  image_url text,
  video_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.advent_opens (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.advent_gifts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null default now(),
  unique(gift_id,user_id)
);

alter table public.advent_admins enable row level security;
alter table public.advent_settings enable row level security;
alter table public.advent_gifts enable row level security;
alter table public.advent_opens enable row level security;

create policy "admins read own admin row" on public.advent_admins
for select to authenticated using (user_id = auth.uid());

create or replace function public.is_advent_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select exists(select 1 from public.advent_admins where user_id = auth.uid()); $$;

-- Solo el administrador puede consultar la lista completa de regalos.
-- Francis puede consultar únicamente los regalos cuya fecha ya llegó.
create policy "admin reads gifts" on public.advent_gifts
for select to authenticated using (public.is_advent_admin());
create policy "user reads unlocked gifts" on public.advent_gifts
for select to authenticated using (unlock_date <= (now() at time zone 'America/Asuncion')::date);
create policy "admin inserts gifts" on public.advent_gifts
for insert to authenticated with check (public.is_advent_admin());
create policy "admin updates gifts" on public.advent_gifts
for update to authenticated using (public.is_advent_admin()) with check (public.is_advent_admin());
create policy "admin deletes gifts" on public.advent_gifts
for delete to authenticated using (public.is_advent_admin());

create policy "users read own opens" on public.advent_opens
for select to authenticated using (user_id = auth.uid() or public.is_advent_admin());
create policy "users open own gifts" on public.advent_opens
for insert to authenticated with check (
  user_id = auth.uid()
  and exists(select 1 from public.advent_gifts g where g.id = gift_id and g.unlock_date <= (now() at time zone 'America/Asuncion')::date)
);
create policy "admin reads settings" on public.advent_settings
for select to authenticated using (public.is_advent_admin());
create policy "public reads settings" on public.advent_settings
for select to authenticated using (true);

-- Crear aquí 24 regalos vacíos, desbloqueados del 1 al 24 de diciembre de 2026.
insert into public.advent_gifts(day,unlock_date,title,message)
select n, make_date(2026,12,n), 'Sorpresa del día ' || n, ''
from generate_series(1,24) as n
on conflict(day) do nothing;

-- IMPORTANTE: después de crear las cuentas en Authentication > Users,
-- copia el UUID de tu cuenta y ejecuta:
-- insert into public.advent_admins(user_id) values ('TU-UUID-DE-USUARIO');
-- Tu novia también debe tener una cuenta normal, sin añadirla a advent_admins.
