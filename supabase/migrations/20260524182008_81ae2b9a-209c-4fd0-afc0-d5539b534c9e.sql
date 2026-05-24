
insert into storage.buckets (id, name, public) values ('moto-fotos', 'moto-fotos', true) on conflict (id) do nothing;

create policy "Public read moto-fotos" on storage.objects for select using (bucket_id = 'moto-fotos');
create policy "Public upload moto-fotos" on storage.objects for insert with check (bucket_id = 'moto-fotos');
create policy "Public delete moto-fotos" on storage.objects for delete using (bucket_id = 'moto-fotos');
