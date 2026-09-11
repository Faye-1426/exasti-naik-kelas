-- Naik Kelas — skema basis data (PRD bagian 11).
-- Satu akun = satu usaha. Semua tabel turunan menggantung pada businesses.

-- Profil usaha, terikat pada satu akun
create table businesses (
  id               uuid primary key default gen_random_uuid(),
  auth_user_id     uuid not null unique references auth.users(id) on delete cascade,
  name             text not null,
  owner_name       text,
  business_type    text,
  address          text,
  established_date date,
  has_nib          boolean not null default false,
  has_npwp         boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Kanal penjualan beserta persentase komisinya
create table channels (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  name           text not null,                    -- Offline, GoFood, ShopeeFood, WhatsApp
  commission_pct numeric not null default 0 check (commission_pct between 0 and 100),
  is_active      boolean not null default true,
  unique (business_id, name)
);

-- Master produk
create table products (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  name          text not null,
  aliases       text[] not null default '{}',      -- variasi penyebutan untuk pencocokan input suara
  category      text,
  selling_price numeric not null check (selling_price >= 0),
  waste_pct     numeric not null default 0 check (waste_pct between 0 and 100),
  created_at    timestamptz not null default now()
);

-- Pencocokan nama hasil transkripsi suara: "es teh" -> Es Teh Manis
create index products_aliases_idx on products using gin (aliases);

-- Komponen biaya penyusun HPP
create table cost_components (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  name          text not null,
  type          text not null check (type in ('material', 'packaging', 'energy', 'labor')),
  cost_per_unit numeric not null check (cost_per_unit >= 0)
);
create index cost_components_product_idx on cost_components (product_id);

-- Batch unggahan sebagai jejak audit. Berkas dan teks asli tidak pernah dibuang.
create table upload_batches (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  source_type  text not null check (source_type in
                 ('marketplace_screenshot', 'pasted_text', 'handwritten_photo', 'voice_input')),
  channel_id   uuid references channels(id) on delete set null,
  file_url     text,
  raw_input    text,                               -- teks asli atau hasil transkripsi
  ai_response  jsonb,
  -- Menentukan tabel tujuan penyimpanan: itemized -> sales, total_only -> sales_totals
  detail_level text not null check (detail_level in ('itemized', 'total_only')),
  status       text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  -- Aturan keras 1: tidak ada penulisan otomatis. Status confirmed wajib punya jejak waktu persetujuan.
  constraint upload_batches_konfirmasi_manusia
    check ((status = 'confirmed') = (confirmed_at is not null))
);
create index upload_batches_business_idx on upload_batches (business_id, created_at desc);

-- Transaksi penjualan berrincian item (Kondisi A)
create table sales (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  batch_id         uuid references upload_batches(id) on delete set null,
  channel_id       uuid not null references channels(id) on delete restrict,
  product_id       uuid references products(id) on delete set null,
  product_name_raw text,
  quantity         integer not null check (quantity >= 0),
  unit_price       numeric not null check (unit_price >= 0),
  total_amount     numeric not null check (total_amount >= 0),
  sale_date        date not null,
  confidence       numeric check (confidence between 0 and 1),
  is_verified      boolean not null default false
);
create index sales_lookup_idx on sales (business_id, sale_date, channel_id);
create index sales_product_idx on sales (product_id, sale_date);

-- Penjualan total tanpa rincian item (Kondisi B).
-- SENGAJA terpisah dari sales: memasukkannya ke sales dengan produk fiktif
-- akan mencemari perhitungan margin per produk.
create table sales_totals (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  batch_id          uuid references upload_batches(id) on delete set null,
  channel_id        uuid not null references channels(id) on delete restrict,
  total_amount      numeric not null check (total_amount >= 0),
  transaction_count integer check (transaction_count >= 0),
  sale_date         date not null
);
create index sales_totals_lookup_idx on sales_totals (business_id, sale_date, channel_id);

-- Pengeluaran
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  batch_id     uuid references upload_batches(id) on delete set null,
  category     text not null,
  description  text,
  amount       numeric not null check (amount >= 0),
  expense_date date not null
);
create index expenses_lookup_idx on expenses (business_id, expense_date);

-- Tingkat kelengkapan data per kanal per periode
create table data_completeness (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  channel_id      uuid not null references channels(id) on delete cascade,
  period_start    date not null,
  period_end      date not null,
  level           text not null check (level in ('complete', 'partial', 'empty')),
  itemized_amount numeric,                         -- omzet yang terinci
  total_amount    numeric,                         -- omzet keseluruhan
  coverage_pct    numeric,                         -- itemized_amount / total_amount
  calculated_at   timestamptz not null default now(),
  unique (channel_id, period_start, period_end)
);

-- Riwayat Skor Kesiapan KUR. Selalu indikatif, bukan keputusan kredit.
create table readiness_scores (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  total_score     integer not null check (total_score between 0 and 100),
  breakdown       jsonb not null,
  recommendations jsonb,
  calculated_at   timestamptz not null default now()
);
create index readiness_scores_business_idx on readiness_scores (business_id, calculated_at desc);

-- Insight yang telah dihasilkan
create table insights (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  period_start date,
  period_end   date,
  content      jsonb not null,
  generated_at timestamptz not null default now()
);
create index insights_business_idx on insights (business_id, generated_at desc);
