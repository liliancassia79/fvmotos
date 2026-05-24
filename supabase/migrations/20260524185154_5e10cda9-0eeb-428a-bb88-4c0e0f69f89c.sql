ALTER TABLE public.ordens_servico ADD COLUMN IF NOT EXISTS pago boolean NOT NULL DEFAULT false;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS pago boolean NOT NULL DEFAULT false;