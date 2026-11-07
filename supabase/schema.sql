-- GPS Ecuador · esquema inicial privado para Supabase
-- Ejecutar en SQL Editor del proyecto Supabase del propietario.
-- No contiene usuarios, contraseñas ni coordenadas.
create extension if not exists pgcrypto;

create table if not exists public.gps_devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  sharing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique(id, owner_id)
);
create table if not exists public.gps_access (
  device_id uuid not null references public.gps_devices(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(device_id,viewer_id)
);
create table if not exists public.gps_positions (
  id bigint generated always as identity primary key,
  device_id uuid not null references public.gps_devices(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  accuracy_m double precision check(accuracy_m between 0 and 100000)
);
create index if not exists gps_positions_device_time_idx on public.gps_positions(device_id, recorded_at desc);

alter table public.gps_devices enable row level security;
alter table public.gps_access enable row level security;
alter table public.gps_positions enable row level security;

revoke all on public.gps_devices,public.gps_access,public.gps_positions from anon;
grant select,insert,update,delete on public.gps_devices to authenticated;
grant select,insert,delete on public.gps_access to authenticated;
grant select,insert,delete on public.gps_positions to authenticated;
grant usage,select on sequence public.gps_positions_id_seq to authenticated;

create policy "Owner reads own devices" on public.gps_devices for select to authenticated
 using (owner_id=(select auth.uid()));
create policy "Owner creates own devices" on public.gps_devices for insert to authenticated
 with check(owner_id=(select auth.uid()));
create policy "Owner updates own devices" on public.gps_devices for update to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "Owner deletes own devices" on public.gps_devices for delete to authenticated
 using(owner_id=(select auth.uid()));

create policy "Owner reads grants" on public.gps_access for select to authenticated
 using(viewer_id=(select auth.uid()) or granted_by=(select auth.uid()));
create policy "Owner grants access" on public.gps_access for insert to authenticated
 with check(granted_by=(select auth.uid()) and exists(select 1 from public.gps_devices d where d.id=device_id and d.owner_id=(select auth.uid())));
create policy "Owner revokes access" on public.gps_access for delete to authenticated
 using(exists(select 1 from public.gps_devices d where d.id=device_id and d.owner_id=(select auth.uid())));

-- Viewers can read positions only while the device owner has explicitly enabled sharing.
create policy "Owner or approved viewer reads positions" on public.gps_positions for select to authenticated
 using(exists(select 1 from public.gps_devices d where d.id=device_id and
   (d.owner_id=(select auth.uid()) or
    (d.sharing_enabled and exists(select 1 from public.gps_access a where a.device_id=d.id and a.viewer_id=(select auth.uid()))))));
create policy "Only owner records positions while sharing" on public.gps_positions for insert to authenticated
 with check(exists(select 1 from public.gps_devices d where d.id=device_id and d.owner_id=(select auth.uid()) and d.sharing_enabled));
create policy "Owner deletes position history" on public.gps_positions for delete to authenticated
 using(exists(select 1 from public.gps_devices d where d.id=device_id and d.owner_id=(select auth.uid())));

-- SECURITY DEFINER avoids cyclic RLS checks between devices and grants.
-- Caller identity is always obtained from auth.uid(), never from an input argument.
create or replace function public.gps_can_view_device(target_device uuid)
returns boolean language sql stable security definer set search_path = ''
as $
 select exists(
   select 1 from public.gps_devices d
   where d.id=target_device and d.sharing_enabled
   and exists(select 1 from public.gps_access a
              where a.device_id=d.id and a.viewer_id=(select auth.uid()))
 );
$;
revoke all on function public.gps_can_view_device(uuid) from public,anon;
grant execute on function public.gps_can_view_device(uuid) to authenticated;

drop policy if exists "Viewer sees shared devices" on public.gps_devices;
create policy "Viewer sees shared devices" on public.gps_devices for select to authenticated
 using(public.gps_can_view_device(id));

drop policy if exists "Owner or approved viewer reads positions" on public.gps_positions;
create policy "Owner or approved viewer reads positions" on public.gps_positions for select to authenticated
 using(public.gps_can_view_device(device_id) or exists(
  select 1 from public.gps_devices d where d.id=device_id and d.owner_id=(select auth.uid())
 ));

-- Grant creation is intentionally owner-only. An authenticated owner must add the viewer
-- explicitly after obtaining the viewer's auth user ID through a trusted enrollment flow.
