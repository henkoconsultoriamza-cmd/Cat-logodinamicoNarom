-- Ejecutar en Supabase > SQL Editor

-- Tabla de pedidos
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references auth.users(id),
  client_email  text not null,
  client_name   text not null,
  items         jsonb not null,
  total         numeric not null,
  status        text not null default 'pendiente'
                check (status in ('pendiente','confirmado','en_preparacion','entregado')),
  notes         text,
  created_at    timestamptz not null default now()
);

-- Solo el usuario admin y el propio cliente pueden ver sus pedidos
alter table public.orders enable row level security;

create policy "Admin ve todos los pedidos"
  on public.orders for all
  using (auth.jwt() ->> 'role' = 'admin');

create policy "Cliente ve sus propios pedidos"
  on public.orders for select
  using (auth.uid() = client_id);

create policy "Cliente inserta sus propios pedidos"
  on public.orders for insert
  with check (auth.uid() = client_id);
