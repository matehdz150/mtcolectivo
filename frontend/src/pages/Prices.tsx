import { useEffect, useState } from "react";
import {
  getServices,
  getServicePrices,
  createServicePrice,
  updateServicePrice,
  deleteServicePrice,
  Service,
  ServicePrice,
} from "../services/prices";

import "./Prices.scss";
import Sidebar from "@/components/Sidebar";

export default function PricesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    capacidad: "",
    period: "morning",
    price_normal: "",
    price_discount: "",
  });

  // 🔥 Cargar servicios
  async function loadServices() {
    const data = await getServices();
    setServices(data);
    if (data.length > 0) {
      setSelectedService(data[0]);
    }
  }

  // 🔥 Cargar precios
  async function loadPrices(serviceId: number) {
    setLoading(true);
    try {
      const data = await getServicePrices(serviceId);
      setPrices(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (selectedService) {
      loadPrices(selectedService.id);
    }
  }, [selectedService]);

  async function handleCreate() {
    if (!selectedService) return;
    if (!form.capacidad || !form.price_normal) return;

    await createServicePrice({
      service_id: selectedService.id,
      capacidad: Number(form.capacidad),
      period: form.period,
      price_normal: Number(form.price_normal),
      price_discount: form.price_discount
        ? Number(form.price_discount)
        : undefined,
    });

    setForm({
      capacidad: "",
      period: "morning",
      price_normal: "",
      price_discount: "",
    });

    loadPrices(selectedService.id);
  }

  async function handleUpdate(id: number, field: string, value: any) {
    await updateServicePrice(id, { [field]: value });
    if (selectedService) loadPrices(selectedService.id);
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este precio?")) return;
    await deleteServicePrice(id);
    if (selectedService) loadPrices(selectedService.id);
  }

  return (
    <div className="prices-layout">
      <Sidebar />

      <div className="prices-page">
        <div className="prices-container">

          {/* HEADER */}
          <div className="prices-header">
            <div>
              <h1>Gestión de Servicios y Precios</h1>
              <p>Administra tarifas dinámicas por capacidad y periodo</p>
            </div>

            <select
              className="service-select"
              value={selectedService?.id || ""}
              onChange={(e) => {
                const service = services.find(
                  (s) => s.id === Number(e.target.value)
                );
                setSelectedService(service || null);
              }}
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.slug})
                </option>
              ))}
            </select>
          </div>

          {/* FORM */}
          {selectedService && (
            <div className="prices-card">
              <h2>Agregar Precio a {selectedService.name}</h2>

              <div className="prices-form-grid">
                <input
                  type="number"
                  placeholder="Capacidad"
                  value={form.capacidad}
                  onChange={(e) =>
                    setForm({ ...form, capacidad: e.target.value })
                  }
                />

                <select
                  value={form.period}
                  onChange={(e) =>
                    setForm({ ...form, period: e.target.value })
                  }
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="full_day">Full Day</option>
                </select>

                <input
                  type="number"
                  placeholder="Precio normal"
                  value={form.price_normal}
                  onChange={(e) =>
                    setForm({ ...form, price_normal: e.target.value })
                  }
                />

                <input
                  type="number"
                  placeholder="Precio descuento"
                  value={form.price_discount}
                  onChange={(e) =>
                    setForm({ ...form, price_discount: e.target.value })
                  }
                />
              </div>

              <button onClick={handleCreate} className="btn-primary">
                Agregar Precio
              </button>
            </div>
          )}

          {/* TABLA SCROLLEABLE */}
          <div className="prices-table-wrapper">
            {loading ? (
              <div className="loading">Cargando precios...</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Capacidad</th>
                    <th>Periodo</th>
                    <th>Precio</th>
                    <th>Descuento</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {prices.map((price) => (
                    <tr key={price.id}>
                      <td>
                        <input
                          type="number"
                          defaultValue={price.capacidad}
                          onBlur={(e) =>
                            handleUpdate(price.id, "capacidad", Number(e.target.value))
                          }
                        />
                      </td>

                      <td>
                        <select
                          defaultValue={price.period}
                          onChange={(e) =>
                            handleUpdate(price.id, "period", e.target.value)
                          }
                        >
                          <option value="morning">Morning</option>
                          <option value="afternoon">Afternoon</option>
                          <option value="full_day">Full Day</option>
                        </select>
                      </td>

                      <td>
                        <input
                          type="number"
                          defaultValue={price.price_normal}
                          onBlur={(e) =>
                            handleUpdate(price.id, "price_normal", Number(e.target.value))
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          defaultValue={price.price_discount ?? ""}
                          onBlur={(e) =>
                            handleUpdate(price.id, "price_discount", Number(e.target.value))
                          }
                        />
                      </td>

                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(price.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}

                  {prices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty">
                        No hay precios registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}