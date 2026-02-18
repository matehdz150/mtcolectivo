// src/services/orders.ts
import { API_BASE, authFetch } from "./api";


export async function fetchOrders(signal?: AbortSignal): Promise<Order[]> {
  const res = await authFetch(`${API_BASE}/orders/`, { signal });
  return res.json();
}

export async function pdfFromData(order: Order, signal?: AbortSignal): Promise<Blob> {
  const res = await authFetch(`${API_BASE}/pdf/from-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
    signal,
  });
  return await res.blob();
}

export async function deleteOrder(id: number, signal?: AbortSignal): Promise<void> {
  await authFetch(`${API_BASE}/orders/${id}`, { method: "DELETE", signal });
}

export type OrderUpdatePayload = {
  nombre?: string;
  fecha?: string;
  direccion_salida?: string;
  destino?: string;
  hora_salida?: string;
  hora_regreso?: string;

  personas?: number;      // recalcula capacidad automática
  capacidadu?: number;    // override manual

  subtotal?: number;      // precio manual
  descuento?: number;     // descuento manual
  abonado?: number;       // pago manual
};

export async function updateOrder(
  id: number,
  payload: OrderUpdatePayload,
  signal?: AbortSignal
): Promise<Order> {
  const res = await authFetch(`${API_BASE}/orders/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  return res.json();
}

export async function wordFromData(
  order: Order,
  signal?: AbortSignal
): Promise<Blob> {
  const res = await authFetch(`${API_BASE}/pdf/from-data-word`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
    signal,
  });

  return await res.blob();
}

export async function fetchStats(signal?: AbortSignal) {
  const res = await authFetch(`${API_BASE}/orders/stats`, { signal });
  return res.json();
}

// src/services/orders.ts

export interface Order {
  id: number;
  nombre?: string;
  fecha?: string;
  dir_salida?: string;
  dir_destino?: string;
  hor_ida?: string;
  hor_regreso?: string;
  duracion?: number;
  capacidadu?: number;
  subtotal?: number;
  descuento?: number;
  total?: number;
  abonado?: number;
  fecha_abono?: string;
  liquidar?: number;
  texto_extra?: string | null;
  created_at?: string;
}

export async function getOrderById(orderId: number): Promise<Order> {
  const res = await authFetch(`${API_BASE}/orders/${orderId}`);

  const data = await res.json();

  return data as Order;
}

export async function getExtraText(orderId: number) {
  const res = await authFetch(`${API_BASE}/orders/${orderId}/extra-text`);
  return res.json();
}

export async function updateExtraText(orderId: number, texto: string) {
  const res = await authFetch(`${API_BASE}/orders/${orderId}/extra-text`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto_extra: texto }),
  });

  return res.json();
}

export async function deleteExtraText(orderId: number) {
  const res = await authFetch(`${API_BASE}/orders/${orderId}/extra-text`, {
    method: "DELETE",
  });

  return res.json();
}