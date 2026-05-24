
-- Função genérica para updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql set search_path = public;

-- Clientes
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  celular text,
  email text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clientes enable row level security;
create policy "auth full clientes" on public.clientes for all to authenticated using (true) with check (true);
create trigger trg_clientes_updated before update on public.clientes for each row execute function public.update_updated_at_column();

-- Ordens de Serviço
create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  modelo text not null,
  placa text not null,
  cliente text not null,
  celular text,
  defeito text,
  valor numeric(10,2),
  forma_pagamento text,
  observacoes text,
  fotos text[] not null default '{}',
  status text not null default 'fila' check (status in ('fila','consertando','pronta')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz,
  finalizado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ordens_servico enable row level security;
create policy "auth full os" on public.ordens_servico for all to authenticated using (true) with check (true);
create trigger trg_os_updated before update on public.ordens_servico for each row execute function public.update_updated_at_column();
create index idx_os_status on public.ordens_servico(status);
create index idx_os_criado on public.ordens_servico(criado_em desc);

-- Orçamentos
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  celular text,
  itens jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  forma_pagamento text,
  status text not null default 'aberto',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orcamentos enable row level security;
create policy "auth full orc" on public.orcamentos for all to authenticated using (true) with check (true);
create trigger trg_orc_updated before update on public.orcamentos for each row execute function public.update_updated_at_column();

-- Agendamentos
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  celular text,
  data_hora timestamptz not null,
  servico text,
  observacoes text,
  confirmado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.agendamentos enable row level security;
create policy "auth full ag" on public.agendamentos for all to authenticated using (true) with check (true);
create trigger trg_ag_updated before update on public.agendamentos for each row execute function public.update_updated_at_column();
create index idx_ag_data on public.agendamentos(data_hora);

-- Catálogo de serviços
create table public.servicos_catalogo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10,2) not null default 0,
  categoria text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.servicos_catalogo enable row level security;
create policy "auth full cat" on public.servicos_catalogo for all to authenticated using (true) with check (true);
create trigger trg_cat_updated before update on public.servicos_catalogo for each row execute function public.update_updated_at_column();

-- Restringir bucket de fotos a usuários autenticados
drop policy if exists "Public upload moto-fotos" on storage.objects;
drop policy if exists "Public delete moto-fotos" on storage.objects;
create policy "auth upload moto-fotos" on storage.objects for insert to authenticated with check (bucket_id = 'moto-fotos');
create policy "auth delete moto-fotos" on storage.objects for delete to authenticated using (bucket_id = 'moto-fotos');
