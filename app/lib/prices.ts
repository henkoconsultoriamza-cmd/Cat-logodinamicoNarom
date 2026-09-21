import { Product } from "../catalog-data";

export type PriceRow = {
  sku: string;
  brand: string;
  price: number;
  sale_price: number | null;
  on_sale: boolean;
  description: string | null;
};

// Fetch all prices from Supabase and merge into product list.
// Supabase prices take precedence over hardcoded values in catalog-data.ts.
export async function mergeSupabasePrices(products: Product[]): Promise<Product[]> {
  try {
    const res = await fetch("/api/prices", { cache: "no-store" });
    if (!res.ok) return products;
    const rows: PriceRow[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return products;

    const map = new Map<string, PriceRow>();
    for (const r of rows) map.set(`${r.brand}||${r.sku}`, r);

    return products.map(p => {
      const override = map.get(`${p.brand}||${p.sku}`);
      if (!override) return p;
      return {
        ...p,
        price:       override.price,
        salePrice:   override.sale_price ?? undefined,
        onSale:      override.on_sale,
        description: override.description ?? p.description,
      };
    });
  } catch {
    return products;
  }
}
