-- Row Level Security. Satu akun = satu usaha, jadi kepemilikan cukup satu lookup.

-- Dipakai di setiap policy. STABLE + SECURITY DEFINER supaya Postgres mengevaluasi
-- sekali per pernyataan, bukan sekali per baris.
create function public.usaha_saya()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.businesses where auth_user_id = auth.uid() limit 1;
$$;

revoke all on function public.usaha_saya() from public;
grant execute on function public.usaha_saya() to authenticated;

-- Tanpa grant, RLS tidak sempat dievaluasi: aksesnya sudah ditolak lebih dulu.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter table businesses        enable row level security;
alter table channels          enable row level security;
alter table products          enable row level security;
alter table cost_components   enable row level security;
alter table upload_batches    enable row level security;
alter table sales             enable row level security;
alter table sales_totals      enable row level security;
alter table expenses          enable row level security;
alter table data_completeness enable row level security;
alter table readiness_scores  enable row level security;
alter table insights          enable row level security;

-- businesses: pemilik baris adalah akunnya sendiri.
create policy usaha_sendiri on businesses
  for all to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Tabel dengan business_id langsung.
create policy milik_usaha on channels
  for all to authenticated using (business_id = usaha_saya()) with check (business_id = usaha_saya());
create policy milik_usaha on products
  for all to authenticated using (business_id = usaha_saya()) with check (business_id = usaha_saya());
create policy milik_usaha on upload_batches
  for all to authenticated using (business_id = usaha_saya()) with check (business_id = usaha_saya());
create policy milik_usaha on sales
  for all to authenticated using (business_id = usaha_saya()) with check (business_id = usaha_saya());
create policy milik_usaha on sales_totals
  for all to authenticated using (business_id = usaha_saya()) with check (business_id = usaha_saya());
create policy milik_usaha on expenses
  for all to authenticated using (business_id = usaha_saya()) with check (business_id = usaha_saya());
create policy milik_usaha on data_completeness
  for all to authenticated using (business_id = usaha_saya()) with check (business_id = usaha_saya());
create policy milik_usaha on readiness_scores
  for all to authenticated using (business_id = usaha_saya()) with check (business_id = usaha_saya());
create policy milik_usaha on insights
  for all to authenticated using (business_id = usaha_saya()) with check (business_id = usaha_saya());

-- cost_components menggantung pada products, bukan businesses.
create policy milik_usaha on cost_components
  for all to authenticated
  using (product_id in (select id from products where business_id = usaha_saya()))
  with check (product_id in (select id from products where business_id = usaha_saya()));

-- Tanpa policy untuk anon: sesi tanpa login tidak melihat baris apa pun.
