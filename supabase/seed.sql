-- Data demo Naik Kelas (PRD bagian 15). Dirancang, bukan diacak:
-- variasinya deterministik (fungsi sin atas nomor hari) supaya angka di layar
-- sama persis setiap kali demo diulang.
--
-- Masuk sebagai: demo@naikkelas.id / demo1234

begin;

-- ── Akun demo ────────────────────────────────────────────────────────────────
-- Kolom token di bawah WAJIB diisi string kosong, bukan dibiarkan NULL.
-- Postgres mengizinkan NULL, tapi GoTrue membacanya ke tipe string yang tidak
-- menerima NULL, jadi setiap percobaan masuk gagal dengan 500
-- "Database error querying schema" — sebelum sandinya sempat diperiksa.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-a111-111111111111',
  'authenticated', 'authenticated', 'demo@naikkelas.id',
  extensions.crypt('demo1234', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '11111111-1111-4111-a111-111111111111',
  '11111111-1111-4111-a111-111111111111',
  '{"sub":"11111111-1111-4111-a111-111111111111","email":"demo@naikkelas.id","email_verified":true}',
  'email', now(), now(), now()
) on conflict do nothing;

-- ── Usaha ────────────────────────────────────────────────────────────────────
insert into businesses (
  id, auth_user_id, name, owner_name, business_type, address,
  established_date, has_nib, has_npwp
) values (
  '22222222-2222-4222-a222-222222222222',
  '11111111-1111-4111-a111-111111111111',
  'Warung Bu Sri', 'Sri Wahyuni', 'Warung makan dan minuman',
  'Jl. Kaliurang Km 5 No. 12, Sleman, DI Yogyakarta',
  current_date - interval '14 months',   -- 14 bulan berjalan -> Lama usaha 9/15
  true, false                            -- NIB ada, NPWP belum -> Dokumen 5/10
);

-- ── Kanal ────────────────────────────────────────────────────────────────────
-- Komisi hanya pada kanal digital. Offline dan WhatsApp 0%.
insert into channels (id, business_id, name, commission_pct) values
  ('33333333-0000-4000-a000-000000000001', '22222222-2222-4222-a222-222222222222', 'Offline',     0),
  ('33333333-0000-4000-a000-000000000002', '22222222-2222-4222-a222-222222222222', 'GoFood',     20),
  ('33333333-0000-4000-a000-000000000003', '22222222-2222-4222-a222-222222222222', 'ShopeeFood', 20),
  ('33333333-0000-4000-a000-000000000004', '22222222-2222-4222-a222-222222222222', 'WhatsApp',    0);

-- ── Produk ───────────────────────────────────────────────────────────────────
-- Es Teh Manis: HPP+susut 4.180. Untung Rp820 offline, RUGI Rp180 di kanal
-- berkomisi 20% -- dan justru produk paling laris. Ini temuan utama demo.
-- Ayam Bakar Madu & Sate Ayam: margin >40% tapi volume kecil (peluang terlewat).
insert into products (id, business_id, name, aliases, category, selling_price, waste_pct) values
  ('44444444-0000-4000-a000-000000000001','22222222-2222-4222-a222-222222222222','Es Teh Manis',        '{"es teh","teh manis","es teh manis dingin","estehmanis"}','Minuman',   5000, 10),
  ('44444444-0000-4000-a000-000000000002','22222222-2222-4222-a222-222222222222','Nasi Ayam Penyet',    '{"ayam penyet","nasi penyet","penyet ayam"}',              'Makanan',  18000,  3),
  ('44444444-0000-4000-a000-000000000003','22222222-2222-4222-a222-222222222222','Nasi Goreng Spesial', '{"nasgor","nasi goreng","nasgor spesial"}',                'Makanan',  20000,  3),
  ('44444444-0000-4000-a000-000000000004','22222222-2222-4222-a222-222222222222','Mie Goreng',          '{"mie","mi goreng","migor"}',                             'Makanan',  16000,  3),
  ('44444444-0000-4000-a000-000000000005','22222222-2222-4222-a222-222222222222','Ayam Bakar Madu',     '{"ayam bakar","ayam madu","bakar madu"}',                  'Makanan',  28000,  2),
  ('44444444-0000-4000-a000-000000000006','22222222-2222-4222-a222-222222222222','Es Jeruk Peras',      '{"es jeruk","jeruk peras","jus jeruk"}',                   'Minuman',   7000,  8),
  ('44444444-0000-4000-a000-000000000007','22222222-2222-4222-a222-222222222222','Teh Botol Dingin',    '{"teh botol","tebo","teh botol sosro"}',                   'Minuman',   6000,  0),
  ('44444444-0000-4000-a000-000000000008','22222222-2222-4222-a222-222222222222','Nasi Rames',          '{"rames","nasi campur","nasi rames komplit"}',            'Makanan',  15000,  4),
  ('44444444-0000-4000-a000-000000000009','22222222-2222-4222-a222-222222222222','Tempe Mendoan',       '{"mendoan","tempe goreng","tempe mendoan 5 biji"}',        'Gorengan',  8000,  5),
  ('44444444-0000-4000-a000-000000000010','22222222-2222-4222-a222-222222222222','Sate Ayam 10 Tusuk',  '{"sate","sate ayam","sate sepuluh tusuk"}',                'Makanan',  25000,  3),
  ('44444444-0000-4000-a000-000000000011','22222222-2222-4222-a222-222222222222','Es Campur',           '{"es campur","escam","es campur spesial"}',                'Minuman',  12000,  8),
  ('44444444-0000-4000-a000-000000000012','22222222-2222-4222-a222-222222222222','Kopi Susu Gula Aren', '{"kopi susu","kopsu","kopi gula aren","kopi aren"}',       'Minuman',  10000,  5);

-- ── Komponen biaya (HPP dasar per porsi) ─────────────────────────────────────
insert into cost_components (product_id, name, type, cost_per_unit) values
  -- Es Teh Manis -> 3.800 dasar, susut 10% (es mencair, tumpah) -> 4.180
  ('44444444-0000-4000-a000-000000000001','Teh tubruk dan gula pasir','material',1400),
  ('44444444-0000-4000-a000-000000000001','Cup, tutup, sedotan','packaging',1100),
  ('44444444-0000-4000-a000-000000000001','Es batu dan listrik kulkas','energy',900),
  ('44444444-0000-4000-a000-000000000001','Waktu peracikan','labor',400),
  -- Nasi Ayam Penyet -> 11.000 dasar, susut 3% -> 11.330
  ('44444444-0000-4000-a000-000000000002','Ayam, beras, sambal, lalapan','material',8200),
  ('44444444-0000-4000-a000-000000000002','Kertas nasi dan kantong','packaging',700),
  ('44444444-0000-4000-a000-000000000002','Gas dan listrik','energy',600),
  ('44444444-0000-4000-a000-000000000002','Waktu memasak','labor',1500),
  -- Nasi Goreng Spesial -> 12.000 dasar, susut 3% -> 12.360
  ('44444444-0000-4000-a000-000000000003','Beras, telur, ayam, bumbu','material',8900),
  ('44444444-0000-4000-a000-000000000003','Kotak nasi dan kantong','packaging',900),
  ('44444444-0000-4000-a000-000000000003','Gas','energy',700),
  ('44444444-0000-4000-a000-000000000003','Waktu memasak','labor',1500),
  -- Mie Goreng -> 9.500 dasar, susut 3% -> 9.785
  ('44444444-0000-4000-a000-000000000004','Mie, telur, sayur, bumbu','material',6800),
  ('44444444-0000-4000-a000-000000000004','Kotak dan kantong','packaging',800),
  ('44444444-0000-4000-a000-000000000004','Gas','energy',600),
  ('44444444-0000-4000-a000-000000000004','Waktu memasak','labor',1300),
  -- Ayam Bakar Madu -> 15.000 dasar, susut 2% -> 15.300 (margin tinggi, volume rendah)
  ('44444444-0000-4000-a000-000000000005','Ayam kampung, madu, bumbu, nasi','material',11200),
  ('44444444-0000-4000-a000-000000000005','Kotak makan dan kantong','packaging',1100),
  ('44444444-0000-4000-a000-000000000005','Arang dan gas','energy',900),
  ('44444444-0000-4000-a000-000000000005','Waktu membakar','labor',1800),
  -- Es Jeruk Peras -> 4.200 dasar, susut 8% -> 4.536
  ('44444444-0000-4000-a000-000000000006','Jeruk peras dan gula','material',2300),
  ('44444444-0000-4000-a000-000000000006','Cup, tutup, sedotan','packaging',1100),
  ('44444444-0000-4000-a000-000000000006','Es batu dan listrik kulkas','energy',500),
  ('44444444-0000-4000-a000-000000000006','Waktu peracikan','labor',300),
  -- Teh Botol Dingin -> 4.500 dasar, tanpa susut
  ('44444444-0000-4000-a000-000000000007','Teh botol kulakan','material',4200),
  ('44444444-0000-4000-a000-000000000007','Kantong','packaging',100),
  ('44444444-0000-4000-a000-000000000007','Listrik kulkas','energy',150),
  ('44444444-0000-4000-a000-000000000007','Waktu penyajian','labor',50),
  -- Nasi Rames -> 9.000 dasar, susut 4% -> 9.360
  ('44444444-0000-4000-a000-000000000008','Beras, lauk, sayur','material',6800),
  ('44444444-0000-4000-a000-000000000008','Kertas nasi dan kantong','packaging',600),
  ('44444444-0000-4000-a000-000000000008','Gas','energy',500),
  ('44444444-0000-4000-a000-000000000008','Waktu penyajian','labor',1100),
  -- Tempe Mendoan -> 3.500 dasar, susut 5% -> 3.675
  ('44444444-0000-4000-a000-000000000009','Tempe, tepung, sambal kecap','material',2100),
  ('44444444-0000-4000-a000-000000000009','Kertas minyak dan kantong','packaging',400),
  ('44444444-0000-4000-a000-000000000009','Minyak goreng dan gas','energy',600),
  ('44444444-0000-4000-a000-000000000009','Waktu menggoreng','labor',400),
  -- Sate Ayam 10 Tusuk -> 14.000 dasar, susut 3% -> 14.420 (margin tinggi, volume rendah)
  ('44444444-0000-4000-a000-000000000010','Ayam, bumbu kacang, lontong','material',10200),
  ('44444444-0000-4000-a000-000000000010','Kotak, tusuk, kantong','packaging',1000),
  ('44444444-0000-4000-a000-000000000010','Arang','energy',800),
  ('44444444-0000-4000-a000-000000000010','Waktu membakar','labor',2000),
  -- Es Campur -> 6.500 dasar, susut 8% -> 7.020
  ('44444444-0000-4000-a000-000000000011','Buah, sirup, susu, cincau','material',4400),
  ('44444444-0000-4000-a000-000000000011','Cup besar, tutup, sendok','packaging',1200),
  ('44444444-0000-4000-a000-000000000011','Es batu dan listrik kulkas','energy',500),
  ('44444444-0000-4000-a000-000000000011','Waktu peracikan','labor',400),
  -- Kopi Susu Gula Aren -> 5.000 dasar, susut 5% -> 5.250
  ('44444444-0000-4000-a000-000000000012','Kopi, susu, gula aren','material',3200),
  ('44444444-0000-4000-a000-000000000012','Cup, tutup, sedotan','packaging',1100),
  ('44444444-0000-4000-a000-000000000012','Es batu dan listrik','energy',300),
  ('44444444-0000-4000-a000-000000000012','Waktu peracikan','labor',400);

-- ── Batch unggahan (jejak audit) ─────────────────────────────────────────────
-- Semua sudah dikonfirmasi manusia. Di aplikasi asli baris penjualan di bawah
-- tidak akan ada sebelum pengguna menekan setuju di layar konfirmasi.
insert into upload_batches (
  id, business_id, source_type, channel_id, raw_input, detail_level, status, created_at, confirmed_at
) values
  ('55555555-0000-4000-a000-000000000001','22222222-2222-4222-a222-222222222222','handwritten_photo',
   '33333333-0000-4000-a000-000000000001',
   'Foto buku catatan harian. Hanya total setoran per hari, tanpa rincian menu.',
   'total_only','confirmed', now() - interval '60 days', now() - interval '60 days'),
  ('55555555-0000-4000-a000-000000000002','22222222-2222-4222-a222-222222222222','voice_input',
   '33333333-0000-4000-a000-000000000001',
   'Rekaman suara tiap tutup warung, dirinci per menu sejak pemilik mulai memakai input suara.',
   'itemized','confirmed', now() - interval '59 days', now() - interval '59 days'),
  ('55555555-0000-4000-a000-000000000003','22222222-2222-4222-a222-222222222222','marketplace_screenshot',
   '33333333-0000-4000-a000-000000000002',
   'Screenshot laporan penjualan GoFood.',
   'itemized','confirmed', now() - interval '1 day', now() - interval '1 day'),
  ('55555555-0000-4000-a000-000000000004','22222222-2222-4222-a222-222222222222','marketplace_screenshot',
   '33333333-0000-4000-a000-000000000003',
   'Screenshot laporan penjualan ShopeeFood.',
   'itemized','confirmed', now() - interval '1 day', now() - interval '1 day'),
  ('55555555-0000-4000-a000-000000000005','22222222-2222-4222-a222-222222222222','pasted_text',
   '33333333-0000-4000-a000-000000000004',
   'Salinan teks pesanan dari chat WhatsApp.',
   'itemized','confirmed', now() - interval '1 day', now() - interval '1 day');

-- ── Kerangka hari x produk x kanal ───────────────────────────────────────────
-- Tabel sementara supaya rumus volumenya ditulis sekali saja.
create temporary table demo_qty on commit drop as
with hari as (
  select d, (current_date - (89 - d))::date as tgl from generate_series(0, 89) as d
),
produk as (
  select * from (values
    ('44444444-0000-4000-a000-000000000001'::uuid, 40),  -- Es Teh Manis, paling laris
    ('44444444-0000-4000-a000-000000000002'::uuid, 14),
    ('44444444-0000-4000-a000-000000000003'::uuid, 12),
    ('44444444-0000-4000-a000-000000000004'::uuid, 10),
    ('44444444-0000-4000-a000-000000000005'::uuid,  2),  -- Ayam Bakar Madu, volume rendah
    ('44444444-0000-4000-a000-000000000006'::uuid, 12),
    ('44444444-0000-4000-a000-000000000007'::uuid,  8),
    ('44444444-0000-4000-a000-000000000008'::uuid, 11),
    ('44444444-0000-4000-a000-000000000009'::uuid,  9),
    ('44444444-0000-4000-a000-000000000010'::uuid,  2),  -- Sate Ayam, volume rendah
    ('44444444-0000-4000-a000-000000000011'::uuid,  6),
    ('44444444-0000-4000-a000-000000000012'::uuid,  7)
  ) as t(product_id, base)
),
kanal as (
  select * from (values
    ('33333333-0000-4000-a000-000000000001'::uuid, 1.00),  -- Offline dominan
    ('33333333-0000-4000-a000-000000000002'::uuid, 0.55),  -- GoFood kedua
    ('33333333-0000-4000-a000-000000000003'::uuid, 0.25),
    ('33333333-0000-4000-a000-000000000004'::uuid, 0.15)
  ) as t(channel_id, bobot)
)
select
  h.d, h.tgl, p.product_id, k.channel_id, pr.selling_price,
  greatest(1, round((
      p.base * k.bobot
      -- dua gelombang beda periode -> tren berombak, bukan garis datar
      * (1 + 0.20 * sin(h.d * 0.9) + 0.12 * sin(h.d * 0.27))
      * (1 + 0.0016 * h.d)                                    -- pertumbuhan landai
      * case when extract(dow from h.tgl) in (0, 6) then 1.22 else 1.0 end
    )::numeric))::int as qty
from hari h
cross join produk p
cross join kanal k
join products pr on pr.id = p.product_id;

-- ── Offline, 30 hari pertama: hanya total harian (tingkat `partial`) ─────────
-- Masuk ke sales_totals. TIDAK dipaksakan ke sales dengan produk fiktif.
insert into sales_totals (business_id, batch_id, channel_id, total_amount, transaction_count, sale_date)
select
  '22222222-2222-4222-a222-222222222222',
  '55555555-0000-4000-a000-000000000001',
  channel_id,
  sum(qty * selling_price),
  greatest(1, round(sum(qty) / 2.6)::int),   -- kira-kira 2,6 item per transaksi
  tgl
from demo_qty
where channel_id = '33333333-0000-4000-a000-000000000001' and d < 30
group by channel_id, tgl;

-- ── Sisanya berrincian item ──────────────────────────────────────────────────
insert into sales (
  business_id, batch_id, channel_id, product_id, product_name_raw,
  quantity, unit_price, total_amount, sale_date, confidence, is_verified
)
select
  '22222222-2222-4222-a222-222222222222',
  case q.channel_id
    when '33333333-0000-4000-a000-000000000001' then '55555555-0000-4000-a000-000000000002'
    when '33333333-0000-4000-a000-000000000002' then '55555555-0000-4000-a000-000000000003'
    when '33333333-0000-4000-a000-000000000003' then '55555555-0000-4000-a000-000000000004'
    else '55555555-0000-4000-a000-000000000005'
  end::uuid,
  q.channel_id, q.product_id, pr.name,
  q.qty, q.selling_price, q.qty * q.selling_price, q.tgl,
  0.97, true
from demo_qty q
join products pr on pr.id = q.product_id
where q.channel_id <> '33333333-0000-4000-a000-000000000001' or q.d >= 30;

-- ── Pengeluaran ──────────────────────────────────────────────────────────────
-- Belanja bahan baku mingguan.
insert into expenses (business_id, category, description, amount, expense_date)
select '22222222-2222-4222-a222-222222222222', 'Bahan baku', 'Belanja pasar mingguan',
       16100000 + round((900000 * sin(w * 1.3))::numeric),
       (current_date - (89 - w * 7))::date
from generate_series(0, 12) as w;

-- Biaya tetap bulanan.
insert into expenses (business_id, category, description, amount, expense_date)
select '22222222-2222-4222-a222-222222222222', kat.nama, kat.ket, kat.jml,
       (current_date - (89 - m * 30) + 4)::date
from generate_series(0, 2) as m
cross join (values
  ('Gaji',        'Upah dua karyawan warung',      7000000),
  ('Sewa',        'Sewa tempat usaha',             3000000),
  ('Utilitas',    'Listrik, air, gas LPG',         2500000),
  ('Operasional', 'Transport, kemasan, lain-lain', 3500000)
) as kat(nama, ket, jml);

-- ── Tingkat kelengkapan data per kanal per periode 30 hari ───────────────────
-- Dihitung dari baris yang baru saja masuk, bukan diketik manual.
insert into data_completeness (
  business_id, channel_id, period_start, period_end, level,
  itemized_amount, total_amount, coverage_pct
)
select
  '22222222-2222-4222-a222-222222222222', c.id, per.mulai, per.selesai,
  case
    when coalesce(rinci.jml, 0) + coalesce(tot.jml, 0) = 0 then 'empty'
    when coalesce(tot.jml, 0) > 0 then 'partial'
    else 'complete'
  end,
  coalesce(rinci.jml, 0),
  coalesce(rinci.jml, 0) + coalesce(tot.jml, 0),
  case when coalesce(rinci.jml, 0) + coalesce(tot.jml, 0) = 0 then 0
       else round(100.0 * coalesce(rinci.jml, 0)
                  / (coalesce(rinci.jml, 0) + coalesce(tot.jml, 0)), 1) end
from channels c
cross join (
  select (current_date - (89 - p * 30))::date      as mulai,
         (current_date - (89 - p * 30) + 29)::date as selesai
  from generate_series(0, 2) as p
) per
left join lateral (
  select sum(total_amount) jml from sales s
  where s.channel_id = c.id and s.sale_date between per.mulai and per.selesai
) rinci on true
left join lateral (
  select sum(total_amount) jml from sales_totals st
  where st.channel_id = c.id and st.sale_date between per.mulai and per.selesai
) tot on true;

-- ── Skor Kesiapan KUR awal ───────────────────────────────────────────────────
-- 63/100, di dalam kisaran 55-65 yang diminta: masih ada ruang perbaikan yang
-- bisa ditunjukkan saat demo. Indikatif, bukan keputusan kredit resmi.
insert into readiness_scores (business_id, total_score, breakdown, recommendations)
values (
  '22222222-2222-4222-a222-222222222222',
  63,
  '{
    "konsistensi_pencatatan": {"skor": 13, "bobot": 25, "dasar": "90 hari tercatat dari 180 hari yang umumnya diminta bank"},
    "kestabilan_omzet":       {"skor": 17, "bobot": 20, "dasar": "Naik turun omzet bulanan masih di bawah 10 persen"},
    "profitabilitas":         {"skor": 12, "bobot": 20, "dasar": "Untung bersih sekitar 14 persen, tapi 30 hari pertama kanal Offline belum terinci"},
    "lama_usaha":             {"skor":  9, "bobot": 15, "dasar": "Usaha berjalan 14 bulan dari 24 bulan untuk skor penuh"},
    "kesehatan_arus_kas":     {"skor":  7, "bobot": 10, "dasar": "Uang masuk sekitar 1,17 kali uang keluar"},
    "kelengkapan_dokumen":    {"skor":  5, "bobot": 10, "dasar": "NIB sudah ada, NPWP belum"}
  }'::jsonb,
  '[
    {"kriteria": "konsistensi_pencatatan", "langkah": "Lanjutkan mencatat setiap hari sampai genap 180 hari.", "dampak_skor": 12},
    {"kriteria": "kelengkapan_dokumen", "langkah": "Urus NPWP usaha, bisa online dan gratis.", "dampak_skor": 5},
    {"kriteria": "profitabilitas", "langkah": "Naikkan harga Es Teh Manis di GoFood dan ShopeeFood jadi Rp6.500. Sekarang tiap gelas yang laku di sana justru rugi Rp180.", "dampak_skor": 4}
  ]'::jsonb
);

-- ── Insight ──────────────────────────────────────────────────────────────────
insert into insights (business_id, period_start, period_end, content)
values (
  '22222222-2222-4222-a222-222222222222',
  current_date - 29, current_date,
  '{
    "temuan": [
      {
        "judul": "Es Teh Manis laris tapi bikin rugi di aplikasi",
        "isi": "Es Teh Manis paling banyak terjual. Di warung untung Rp820 per gelas. Tapi di GoFood dan ShopeeFood, setelah potongan aplikasi 20 persen sebesar Rp1.000, tiap gelas rugi Rp180.",
        "saran": "Naikkan harga di aplikasi jadi Rp6.500. Harga di warung tidak perlu berubah."
      },
      {
        "judul": "Ayam Bakar Madu paling untung tapi jarang laku",
        "isi": "Untung Rp12.700 per porsi di warung, tertinggi dari semua menu. Tapi rata-rata cuma laku 2 porsi sehari.",
        "saran": "Coba tawarkan sebagai menu andalan di foto etalase GoFood."
      },
      {
        "judul": "Catatan bulan pertama masih berupa total harian",
        "isi": "Kanal Offline pada 30 hari pertama cuma punya total setoran, tanpa rincian menu. Omzet dan uang masuk tetap terhitung, tapi untung per menu untuk periode itu belum bisa dilihat.",
        "saran": "Pakai input suara tiap tutup warung supaya rinciannya ikut tercatat."
      }
    ]
  }'::jsonb
);

commit;
