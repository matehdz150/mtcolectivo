import { API_BASE, authFetch } from "./api";

export interface ServicePrice {
  id: number;
  service_id: number;
  capacidad: number;
  period: "morning" | "afternoon" | "full_day";
  price_normal: number;
  price_discount?: number | null;
}

export async function getServicePrices(serviceId: number): Promise<ServicePrice[]> {
  const res = await authFetch(
    `${API_BASE}/service-prices?service_id=${serviceId}`
  );
  return await res.json();
}

export async function createServicePrice(data: {
  service_id: number;
  capacidad: number;
  period: string;
  price_normal: number;
  price_discount?: number;
}): Promise<ServicePrice> {

  const res = await authFetch(`${API_BASE}/service-prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return await res.json();
}

export async function updateServicePrice(
  priceId: number,
  data: Partial<ServicePrice>
): Promise<ServicePrice> {

  const res = await authFetch(
    `${API_BASE}/service-prices/${priceId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  return await res.json();
}

export async function deleteServicePrice(priceId: number): Promise<void> {
  await authFetch(`${API_BASE}/service-prices/${priceId}`, {
    method: "DELETE",
  });
}

export interface Service {
  id: number;
  name: string;
  slug: string;
}


// 🔹 Servicios
export async function getServices(): Promise<Service[]> {
  const res = await authFetch(`${API_BASE}/service-prices/services`);
  return res.json();
}
