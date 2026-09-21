-- Ejecutar en Supabase SQL Editor
-- Tabla de precios en schema catalog

CREATE TABLE IF NOT EXISTS catalog.prices (
  sku         TEXT        NOT NULL,
  brand       TEXT        NOT NULL,
  price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price  NUMERIC(12,2),
  on_sale     BOOLEAN     NOT NULL DEFAULT false,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sku, brand)
);

-- Cualquiera puede leer precios
ALTER TABLE catalog.prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read prices"  ON catalog.prices FOR SELECT USING (true);
CREATE POLICY "auth write prices"   ON catalog.prices FOR ALL    USING (auth.role() = 'authenticated');
