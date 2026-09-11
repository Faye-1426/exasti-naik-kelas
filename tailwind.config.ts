import type { Config } from "tailwindcss";

/** Semua warna berasal dari CSS variable di globals.css.
 *  Jangan pernah menulis hex mentah di dalam komponen.
 *  Tidak ada `darkMode` — mode gelap sengaja tidak dibuat, lihat DESIGN.md §1.3. */
const config: Config = {
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    // Mulai 360px (perangkat terkecil) sampai 1536px (dashboard desktop lebar).
    screens: {
      xs: "360px",
      sm: "640px",
      md: "768px",
      lg: "1024px", // ambang sidebar menggantikan nav bawah
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // --- Merek ---
        ink: {
          DEFAULT: "hsl(var(--ink))",
          hover: "hsl(var(--ink-hover))",
          soft: "hsl(var(--ink-soft))",
        },
        amber: {
          DEFAULT: "hsl(var(--amber))",
          hover: "hsl(var(--amber-hover))",
          foreground: "hsl(var(--amber-foreground))",
          soft: "hsl(var(--amber-soft))",
        },

        // --- Semantik: JANGAN dipakai sebagai warna merek ---
        positive: {
          DEFAULT: "hsl(var(--positive))",
          soft: "hsl(var(--positive-soft))",
        },
        negative: {
          DEFAULT: "hsl(var(--negative))",
          soft: "hsl(var(--negative-soft))",
        },
        unknown: {
          DEFAULT: "hsl(var(--unknown))",
          soft: "hsl(var(--unknown-soft))",
        },

        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          positive: "hsl(var(--chart-positive))",
          negative: "hsl(var(--chart-negative))",
          grid: "hsl(var(--chart-grid))",
          axis: "hsl(var(--chart-axis))",
        },

        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      // Skala tertutup. Tidak ada teks di bawah 13px di mana pun.
      fontSize: {
        caption: ["0.8125rem", { lineHeight: "1.4" }], //  13px satuan, sumbu grafik
        label: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }], // 14px
        body: ["1rem", { lineHeight: "1.5" }], //  16px teks & angka tabel
        section: ["1.0625rem", { lineHeight: "1.35", fontWeight: "600" }], // 17px h2
        title: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }], // 20px h1
        // clamp menjaga "Rp 12.450.000" muat satu baris di 360px,
        // dan tetap tumbuh sampai 32px di layar desktop.
        metric: [
          "clamp(1.5rem, 4vw, 2rem)",
          { lineHeight: "1.15", fontWeight: "600" },
        ],
      },

      spacing: {
        // Target sentuh — syarat kelulusan, bukan preferensi.
        touch: "2.75rem", // 44px
        "touch-lg": "3rem", // 48px
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // Satu tingkat saja. Kedalaman dinyatakan lewat border, bukan bayangan —
      // layar Android murah me-render bayangan besar dengan pita warna.
      boxShadow: {
        card: "0 1px 2px rgb(28 25 23 / 0.06)",
      },

      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
