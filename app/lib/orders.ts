import { catalogSupabase } from "./catalog-supabase";

export type OrderStatus = "pendiente" | "confirmado" | "en_preparacion" | "entregado";

export type OrderItem = {
  productId: string;
  name: string;
  brand: string;
  sku: string;
  unitPrice: number;
  quantity: number;
};

export type Order = {
  id: string;
  client_id: string;
  client_email: string;
  client_name: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
  notes?: string;
};

export async function saveOrder(params: {
  clientId: string;
  clientEmail: string;
  clientName: string;
  items: OrderItem[];
  total: number;
}) {
  const { data, error } = await catalogSupabase
    .from("orders")
    .insert({
      client_id:    params.clientId,
      client_email: params.clientEmail,
      client_name:  params.clientName,
      items:        params.items,
      total:        params.total,
      status:       "pendiente",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Order;
}

export async function getOrders() {
  const { data, error } = await catalogSupabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { error } = await catalogSupabase
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}
