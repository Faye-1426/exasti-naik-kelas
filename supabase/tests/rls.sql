-- Uji kebocoran antar akun. Jalankan setelah migrasi + seed:
--   psql "$DATABASE_URL" -f supabase/tests/rls.sql
-- Berhasil kalau berakhir dengan "RLS AMAN". Gagal = raise exception.
--
-- Dibungkus rollback: tidak meninggalkan jejak di basis data.

begin;

-- Akun kedua, sebagai pembanding.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000000',
        '99999999-9999-4999-a999-999999999999',
        'authenticated', 'authenticated', 'penyusup@contoh.id', 'x',
        now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

insert into businesses (id, auth_user_id, name)
values ('88888888-8888-4888-a888-888888888888',
        '99999999-9999-4999-a999-999999999999', 'Warung Sebelah');

insert into channels (id, business_id, name, commission_pct)
values ('77777777-0000-4000-a000-000000000001',
        '88888888-8888-4888-a888-888888888888', 'Offline', 0);

insert into products (id, business_id, name, selling_price)
values ('66666666-0000-4000-a000-000000000001',
        '88888888-8888-4888-a888-888888888888', 'Produk Sebelah', 1000);

insert into cost_components (product_id, name, type, cost_per_unit)
values ('66666666-0000-4000-a000-000000000001', 'Bahan', 'material', 400);

insert into sales (business_id, channel_id, product_id, quantity, unit_price, total_amount, sale_date)
values ('88888888-8888-4888-a888-888888888888', '77777777-0000-4000-a000-000000000001',
        '66666666-0000-4000-a000-000000000001', 1, 1000, 1000, current_date);

insert into sales_totals (business_id, channel_id, total_amount, sale_date)
values ('88888888-8888-4888-a888-888888888888', '77777777-0000-4000-a000-000000000001', 1000, current_date);

insert into expenses (business_id, category, amount, expense_date)
values ('88888888-8888-4888-a888-888888888888', 'Bahan baku', 500, current_date);

insert into upload_batches (business_id, source_type, detail_level)
values ('88888888-8888-4888-a888-888888888888', 'pasted_text', 'itemized');

insert into data_completeness (business_id, channel_id, period_start, period_end, level)
values ('88888888-8888-4888-a888-888888888888', '77777777-0000-4000-a000-000000000001',
        current_date, current_date, 'complete');

insert into readiness_scores (business_id, total_score, breakdown)
values ('88888888-8888-4888-a888-888888888888', 40, '{}'::jsonb);

insert into insights (business_id, content)
values ('88888888-8888-4888-a888-888888888888', '{}'::jsonb);

-- Masuk sebagai akun demo, bukan superuser (superuser melewati RLS).
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-a111-111111111111';

do $$
declare
  t text;
  bocor bigint;
  milik bigint;
begin
  -- businesses memakai kolom id, bukan business_id.
  select count(*) into bocor from businesses
  where id = '88888888-8888-4888-a888-888888888888';
  if bocor <> 0 then
    raise exception 'BOCOR: businesses memperlihatkan usaha milik akun lain';
  end if;

  -- Tidak satu pun baris milik "Warung Sebelah" boleh terlihat.
  foreach t in array array[
    'channels', 'products', 'upload_batches', 'sales', 'sales_totals',
    'expenses', 'data_completeness', 'readiness_scores', 'insights'
  ] loop
    execute format(
      'select count(*) from %I where business_id = %L',
      t, '88888888-8888-4888-a888-888888888888'
    ) into bocor;
    if bocor <> 0 then
      raise exception 'BOCOR: % memperlihatkan % baris milik akun lain', t, bocor;
    end if;
  end loop;

  -- cost_components tidak punya business_id, dicek lewat produknya.
  select count(*) into bocor from cost_components
  where product_id = '66666666-0000-4000-a000-000000000001';
  if bocor <> 0 then
    raise exception 'BOCOR: cost_components memperlihatkan % baris milik akun lain', bocor;
  end if;

  -- Sebaliknya: data sendiri harus tetap terbaca, bukan ikut terblokir.
  select count(*) into milik from sales;
  if milik = 0 then
    raise exception 'RLS terlalu ketat: data sendiri ikut hilang';
  end if;

  -- Menulis atas nama usaha orang lain harus ditolak WITH CHECK.
  begin
    insert into sales (business_id, channel_id, quantity, unit_price, total_amount, sale_date)
    values ('88888888-8888-4888-a888-888888888888',
            '77777777-0000-4000-a000-000000000001', 1, 1, 1, current_date);
    raise exception 'BOCOR: berhasil menulis ke usaha milik akun lain';
  exception
    when insufficient_privilege then null;  -- inilah yang diharapkan
  end;

  raise notice 'RLS AMAN — % baris penjualan sendiri terbaca, 0 baris akun lain', milik;
end $$;

rollback;
