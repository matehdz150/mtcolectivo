import { useEffect, useState } from "react";
import {
  getServicePrices,
  createServicePrice,
  updateServicePrice,
  deleteServicePrice,
  ServicePrice,
} from "../services/prices";

import "./PricesPage.scss";

const DEFAULT_SERVICE_ID = 1;

export default function PricesPage() {
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    capacidad: "",
    period: "morning",
    price_normal: "",
    price_discount: "",
  });

  async function loadPrices() {
    setLoading(true);
    try {
      const data = await getServicePrices(DEFAULT_SERVICE_ID);
      setPrices(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrices();
  }, []);

  async function handleCreate() {
    if (!form.capacidad || !form.price_normal) return;

    await createServicePrice({
      service_id: DEFAULT_SERVICE_ID,
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

    loadPrices();
  }

  async function handleUpdate(id: number, field: string, value: any) {
    await updateServicePrice(id, { [field]: value });
    loadPrices();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este precio?")) return;
    await deleteServicePrice(id);
    loadPrices();
  }

  return (
    <div className="prices-page">
      <div className="prices-container">

        <div className="prices-header">
          <h1>Gestión de Precios</h1>
          <p>Administra capacidades y tarifas por periodo</p>
        </div>

        {/* FORM */}
        <div className="prices-card">
          <h2>Agregar Precio</h2>

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

        {/* TABLE */}
        <div className="prices-table-wrapper">
          {loading ? (
            <div className="loading">Cargando precios...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Capacidad</th>
                  <th>Periodo</th>
                  <th>Precio Normal</th>
                  <th>Descuento</th>
                  <th>Acciones</th>
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
  );
}