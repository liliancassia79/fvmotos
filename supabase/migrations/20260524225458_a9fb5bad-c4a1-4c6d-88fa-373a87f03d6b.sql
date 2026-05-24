
-- Restrict all tables to authenticated users only
DROP POLICY IF EXISTS "public full ag" ON public.agendamentos;
CREATE POLICY "auth full ag" ON public.agendamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public full clientes" ON public.clientes;
CREATE POLICY "auth full clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public full orc" ON public.orcamentos;
CREATE POLICY "auth full orc" ON public.orcamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public full os" ON public.ordens_servico;
CREATE POLICY "auth full os" ON public.ordens_servico FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public full pagamentos" ON public.pagamentos;
CREATE POLICY "auth full pagamentos" ON public.pagamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public full cat" ON public.servicos_catalogo;
CREATE POLICY "auth read cat" ON public.servicos_catalogo FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write cat" ON public.servicos_catalogo FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update cat" ON public.servicos_catalogo FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete cat" ON public.servicos_catalogo FOR DELETE TO authenticated USING (true);

-- Storage: moto-fotos - restrict writes to authenticated, keep public read for image display
DROP POLICY IF EXISTS "moto-fotos anon insert" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos anon update" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos anon delete" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos public insert" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos public update" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos public delete" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos insert" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos update" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos delete" ON storage.objects;

CREATE POLICY "moto-fotos auth insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'moto-fotos');
CREATE POLICY "moto-fotos auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'moto-fotos') WITH CHECK (bucket_id = 'moto-fotos');
CREATE POLICY "moto-fotos auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'moto-fotos');
