-- Verifikasi data demo. Jalankan setelah seed:
--   psql "$DATABASE_URL" -f supabase/verifikasi.sql
-- Aritmatika di sini murni SQL sisi server, sesuai aturan keras 4.

\echo '=== 1. Margin per produk per kanal (yang negatif ditandai) ==='

with hpp as (
  select
    p.id, p.name, p.selling_price, p.waste_pct,
    sum(cc.cost_per_unit)                                              as hpp_dasar,
    round(sum(cc.cost_per_unit) * (1 + p.waste_pct / 100.0), 2)        as hpp_susut
  from products p
  join cost_components cc on cc.product_id = p.id
  group by p.id, p.name, p.selling_price, p.waste_pct
),
terjual as (
  select product_id, channel_id, sum(quantity) as qty, sum(total_amount) as omzet
  from sales
  group by product_id, channel_id
)
select
  h.name                                                        as produk,
  c.name                                                        as kanal,
  h.selling_price                                               as harga_jual,
  h.hpp_susut                                                   as hpp_plus_susut,
  round(h.selling_price * c.commission_pct / 100.0, 2)          as potongan_kanal,
  round(h.selling_price - h.hpp_susut
        - h.selling_price * c.commission_pct / 100.0, 2)        as margin_nominal,
  round(100.0 * (h.selling_price - h.hpp_susut
        - h.selling_price * c.commission_pct / 100.0)
        / h.selling_price, 1)                                   as margin_persen,
  coalesce(t.qty, 0)                                            as qty_terjual,
  round(coalesce(t.qty, 0) * (h.selling_price - h.hpp_susut
        - h.selling_price * c.commission_pct / 100.0))          as untung_total,
  case when h.selling_price - h.hpp_susut
            - h.selling_price * c.commission_pct / 100.0 < 0
       then '<<< RUGI' else '' end                              as penanda
from hpp h
cross join channels c
left join terjual t on t.product_id = h.id and t.channel_id = c.id
order by margin_nominal asc, produk;

\echo ''
\echo '=== 2. Tingkat kelengkapan per kanal per periode 30 hari ==='

select
  c.name                                        as kanal,
  dc.period_start                               as mulai,
  dc.period_end                                 as selesai,
  dc.level                                      as tingkat,
  dc.itemized_amount                            as omzet_terinci,
  dc.total_amount                               as omzet_seluruh,
  dc.coverage_pct                               as cakupan_persen
from data_completeness dc
join channels c on c.id = dc.channel_id
order by c.name, dc.period_start;

\echo ''
\echo '=== 3. Omzet = sales + sales_totals (keduanya dijumlah) ==='

select
  coalesce((select sum(total_amount) from sales), 0)                       as omzet_terinci,
  coalesce((select sum(total_amount) from sales_totals), 0)                as omzet_total_saja,
  coalesce((select sum(total_amount) from sales), 0)
    + coalesce((select sum(total_amount) from sales_totals), 0)            as omzet_gabungan,
  coalesce((select sum(amount) from expenses), 0)                          as uang_keluar,
  round((coalesce((select sum(total_amount) from sales), 0)
    + coalesce((select sum(total_amount) from sales_totals), 0))
    / nullif((select sum(amount) from expenses), 0), 2)                    as rasio_arus_kas;

\echo ''
\echo '=== 4. Produk paling laris vs paling untung per porsi (kanal Offline) ==='

with hpp as (
  select p.id, p.name, p.selling_price,
         round(sum(cc.cost_per_unit) * (1 + p.waste_pct / 100.0), 2) as hpp_susut
  from products p join cost_components cc on cc.product_id = p.id
  group by p.id, p.name, p.selling_price, p.waste_pct
)
select
  h.name                                     as produk,
  sum(s.quantity)                            as total_terjual_semua_kanal,
  round(h.selling_price - h.hpp_susut, 2)    as untung_per_porsi_offline
from hpp h
join sales s on s.product_id = h.id
group by h.name, h.selling_price, h.hpp_susut
order by total_terjual_semua_kanal desc;

\echo ''
\echo '=== 5. Skor Kesiapan KUR awal (harus 55-65) ==='

select total_score, jsonb_pretty(breakdown) as rincian from readiness_scores;
