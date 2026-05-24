
CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL CHECK (origem IN ('os','orcamento')),
  origem_id uuid NOT NULL,
  cliente text NOT NULL,
  descricao text,
  valor numeric NOT NULL DEFAULT 0,
  forma_pagamento text,
  status text NOT NULL DEFAULT 'pago',
  pago_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (origem, origem_id)
);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public full pagamentos"
  ON public.pagamentos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_pagamentos_updated_at
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pagamentos_pago_em ON public.pagamentos (pago_em DESC);

-- Trigger para O.S.
CREATE OR REPLACE FUNCTION public.sync_pagamento_os()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pago = true THEN
    INSERT INTO public.pagamentos (origem, origem_id, cliente, descricao, valor, forma_pagamento, status, pago_em)
    VALUES ('os', NEW.id, NEW.cliente,
            'O.S. ' || NEW.modelo || ' · ' || NEW.placa,
            COALESCE(NEW.valor, 0), NEW.forma_pagamento, 'pago',
            COALESCE(NEW.finalizado_em, NEW.atualizado_em, now()))
    ON CONFLICT (origem, origem_id) DO UPDATE
      SET cliente = EXCLUDED.cliente,
          descricao = EXCLUDED.descricao,
          valor = EXCLUDED.valor,
          forma_pagamento = EXCLUDED.forma_pagamento,
          status = 'pago',
          pago_em = EXCLUDED.pago_em,
          updated_at = now();
  ELSE
    DELETE FROM public.pagamentos WHERE origem = 'os' AND origem_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_pagamento_os
  AFTER INSERT OR UPDATE OF pago, valor, forma_pagamento, cliente, modelo, placa, finalizado_em
  ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.sync_pagamento_os();

-- Trigger para Orçamentos
CREATE OR REPLACE FUNCTION public.sync_pagamento_orc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pago = true THEN
    INSERT INTO public.pagamentos (origem, origem_id, cliente, descricao, valor, forma_pagamento, status, pago_em)
    VALUES ('orcamento', NEW.id, NEW.cliente,
            'Orçamento aprovado',
            COALESCE(NEW.total, 0), NEW.forma_pagamento, 'pago',
            COALESCE(NEW.updated_at, now()))
    ON CONFLICT (origem, origem_id) DO UPDATE
      SET cliente = EXCLUDED.cliente,
          valor = EXCLUDED.valor,
          forma_pagamento = EXCLUDED.forma_pagamento,
          status = 'pago',
          pago_em = EXCLUDED.pago_em,
          updated_at = now();
  ELSE
    DELETE FROM public.pagamentos WHERE origem = 'orcamento' AND origem_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_pagamento_orc
  AFTER INSERT OR UPDATE OF pago, total, forma_pagamento, cliente
  ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.sync_pagamento_orc();

-- Backfill com dados já marcados como pagos
INSERT INTO public.pagamentos (origem, origem_id, cliente, descricao, valor, forma_pagamento, status, pago_em)
SELECT 'os', id, cliente, 'O.S. ' || modelo || ' · ' || placa,
       COALESCE(valor, 0), forma_pagamento, 'pago',
       COALESCE(finalizado_em, atualizado_em, criado_em)
FROM public.ordens_servico WHERE pago = true
ON CONFLICT (origem, origem_id) DO NOTHING;

INSERT INTO public.pagamentos (origem, origem_id, cliente, descricao, valor, forma_pagamento, status, pago_em)
SELECT 'orcamento', id, cliente, 'Orçamento aprovado',
       COALESCE(total, 0), forma_pagamento, 'pago',
       COALESCE(updated_at, created_at)
FROM public.orcamentos WHERE pago = true
ON CONFLICT (origem, origem_id) DO NOTHING;
