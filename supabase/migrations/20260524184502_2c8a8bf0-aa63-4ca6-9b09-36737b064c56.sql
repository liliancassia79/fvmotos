
-- Substitui políticas restritas por acesso público (uso single-device)
DROP POLICY IF EXISTS "auth full os" ON public.ordens_servico;
DROP POLICY IF EXISTS "auth full clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth full orc" ON public.orcamentos;
DROP POLICY IF EXISTS "auth full ag" ON public.agendamentos;
DROP POLICY IF EXISTS "auth full cat" ON public.servicos_catalogo;

CREATE POLICY "public full os" ON public.ordens_servico FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public full clientes" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public full orc" ON public.orcamentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public full ag" ON public.agendamentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public full cat" ON public.servicos_catalogo FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Storage: bucket moto-fotos público para leitura/escrita
DROP POLICY IF EXISTS "moto-fotos read" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos write" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos update" ON storage.objects;
DROP POLICY IF EXISTS "moto-fotos delete" ON storage.objects;

CREATE POLICY "moto-fotos read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'moto-fotos');
CREATE POLICY "moto-fotos write" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'moto-fotos');
CREATE POLICY "moto-fotos update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'moto-fotos');
CREATE POLICY "moto-fotos delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'moto-fotos');
