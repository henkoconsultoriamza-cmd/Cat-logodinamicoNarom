-- Ejecutar en Supabase → SQL Editor
-- Crear tabla de productos en el schema catalog

CREATE TABLE IF NOT EXISTS catalog.products (
  id            TEXT        PRIMARY KEY,
  sku           TEXT        NOT NULL,
  name          TEXT        NOT NULL DEFAULT '',
  brand         TEXT        NOT NULL DEFAULT '',
  category      TEXT        NOT NULL DEFAULT '',
  description   TEXT        NOT NULL DEFAULT '',
  image         TEXT        NOT NULL DEFAULT '',
  image_color   TEXT        NOT NULL DEFAULT '',
  image_icon    TEXT        NOT NULL DEFAULT '',
  tag           TEXT,
  price         NUMERIC     NOT NULL DEFAULT 0,
  price_retail  NUMERIC,
  sale_price    NUMERIC,
  on_sale       BOOLEAN     NOT NULL DEFAULT false,
  min_qty       INTEGER     NOT NULL DEFAULT 1,
  stock         INTEGER     NOT NULL DEFAULT 100,
  specs         JSONB,
  variants      JSONB,
  is_deleted    BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices útiles para búsqueda
CREATE INDEX IF NOT EXISTS products_sku_idx   ON catalog.products (sku);
CREATE INDEX IF NOT EXISTS products_brand_idx ON catalog.products (brand);

-- Permisos: anon puede leer; solo service_role puede escribir
GRANT USAGE  ON SCHEMA catalog                TO anon, authenticated, service_role;
GRANT SELECT ON catalog.products              TO anon, authenticated;
GRANT ALL    ON catalog.products              TO service_role;

-- Tabla de settings globales (WhatsApp, moneda, etc.)
CREATE TABLE IF NOT EXISTS catalog.settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON catalog.settings TO anon, authenticated;
GRANT ALL    ON catalog.settings TO service_role;

-- Seed inicial de settings
INSERT INTO catalog.settings (key, value) VALUES
  ('whatsappNumber', '5492613020015'),
  ('currency',       'ARS'),
  ('businessName',   'Narom Group'),
  ('accentColor',    '#F4AA24')
ON CONFLICT (key) DO NOTHING;
