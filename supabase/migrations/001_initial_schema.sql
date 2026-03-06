-- =============================================
-- RC Digital Gestão — Initial Schema
-- Run in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- =============================================
-- Usuarios (extended profile linked to auth)
-- =============================================
create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text unique,
  role text check (role in ('admin','team')) default 'team',
  funcao text,
  avatar text,
  telefone text,
  foto_url text,
  criado_em timestamptz default now()
);

alter table public.usuarios enable row level security;

create policy "usuarios_select_own" on public.usuarios
  for select using (auth.uid() = id);

create policy "usuarios_select_admin" on public.usuarios
  for select using (
    exists (
      select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "usuarios_update_own" on public.usuarios
  for update using (auth.uid() = id);

-- =============================================
-- Clientes
-- =============================================
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  site text,
  tipo text check (tipo in ('E-commerce','Negócio Local','Info Produto','Outros')) default 'Outros',
  status text check (status in ('Prospectando','Ativo','Encerrado')) default 'Prospectando',
  investimento_mensal numeric default 0,
  conta_meta_ads text,
  conta_google_ads text,
  meta_faturamento numeric default 0,
  faturado_ate_data numeric default 0,
  responsaveis text[] default '{}',
  -- Admin-only fields
  contrato_mensal numeric default 0,
  vigencia_inicio date,
  vigencia_fim date,
  nps integer check (nps between 0 and 10),
  criado_em timestamptz default now()
);

alter table public.clientes enable row level security;

create policy "clientes_select_auth" on public.clientes
  for select using (auth.role() = 'authenticated');

create policy "clientes_insert_admin" on public.clientes
  for insert with check (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "clientes_update_admin" on public.clientes
  for update using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "clientes_delete_admin" on public.clientes
  for delete using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

-- =============================================
-- Tarefas
-- =============================================
create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  cliente_id uuid references public.clientes(id) on delete set null,
  solicitante text,
  responsavel text,
  prioridade text check (prioridade in ('alta','média','baixa')) default 'média',
  status text check (status in ('A Fazer','Em Andamento','Em Revisão','Concluído')) default 'A Fazer',
  data_vencimento date,
  recorrencia text check (recorrencia in ('não','diária','semanal','quinzenal','mensal')) default 'não',
  criado_em timestamptz default now()
);

alter table public.tarefas enable row level security;

create policy "tarefas_select_auth" on public.tarefas
  for select using (auth.role() = 'authenticated');

create policy "tarefas_insert_admin" on public.tarefas
  for insert with check (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "tarefas_update_admin" on public.tarefas
  for update using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "tarefas_delete_admin" on public.tarefas
  for delete using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

-- =============================================
-- Leads (CRM)
-- =============================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  empresa text not null,
  contato text,
  valor_estimado numeric default 0,
  origem text,
  notas text,
  status text check (status in ('Leads','Contato Feito','Proposta Enviada','Negociação','Fechado','Perdido')) default 'Leads',
  criado_em timestamptz default now()
);

alter table public.leads enable row level security;

create policy "leads_all_admin" on public.leads
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

-- =============================================
-- Membros do Time
-- =============================================
create table if not exists public.membros_time (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  foto_url text,
  telefone text,
  funcao text,
  criado_em timestamptz default now()
);

alter table public.membros_time enable row level security;

create policy "membros_all_admin" on public.membros_time
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.role = 'admin')
  );

-- =============================================
-- Function to auto-create usuario on signup
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'team')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
