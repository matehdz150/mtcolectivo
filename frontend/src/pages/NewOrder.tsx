import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrderManual } from "../services/orders";
import { sileo } from "sileo";
import 'NewOrder.scss';
import Sidebar from "../components/Sidebar";

export default function OrderCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "",
    fecha: "",
    direccion_salida: "",
    destino: "",
    hora_salida: "",
    hora_regreso: "",
    capacidadu: "",
    subtotal: "",
    descuento: "",
    abonado: "",
    texto_extra: "",
  });

  // ===============================
  // HANDLER
  // ===============================
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // ===============================
  // SAVE
  // ===============================
  async function saveOrder() {
    const payload = {
      nombre: form.nombre,
      fecha: form.fecha,
      direccion_salida: form.direccion_salida || undefined,
      destino: form.destino || undefined,
      hora_salida: form.hora_salida || undefined,
      hora_regreso: form.hora_regreso || undefined,
      capacidadu: form.capacidadu ? Number(form.capacidadu) : undefined,
      subtotal: form.subtotal ? Number(form.subtotal) : 0,
      descuento: form.descuento ? Number(form.descuento) : 0,
      abonado: form.abonado ? Number(form.abonado) : 0,
      texto_extra: form.texto_extra || undefined,
    };

    const result = await sileo.promise(createOrderManual(payload), {
      loading: { title: "Creando orden..." },
      success: { title: "Orden creada" },
      error: { title: "Error al crear orden" },
    });

    // 👉 redirige al edit (como flujo natural)
    navigate(`/orders/${result.id}`);
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-content">
        <div className="order-card">
          {/* HEADER */}
          <div className="order-header">
            <h1>Nueva Orden</h1>

            <div className="header-actions">
              <button
                className="btn-secondary"
                onClick={() => navigate("/orders")}
              >
                Cancelar
              </button>
              <button className="btn-primary" onClick={saveOrder}>
                Crear
              </button>
            </div>
          </div>

          {/* =============================== */}
          {/* DETALLES */}
          {/* =============================== */}
          <section className="section">
            <h2>Detalles del servicio</h2>

            <div className="form-group full">
              <label>Nombre del cliente</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Fecha</label>
                <input
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Capacidad</label>
                <input
                  type="number"
                  name="capacidadu"
                  value={form.capacidadu}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Dirección salida</label>
                <input
                  name="direccion_salida"
                  value={form.direccion_salida}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Destino</label>
                <input
                  name="destino"
                  value={form.destino}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Hora ida</label>
                <input
                  name="hora_salida"
                  value={form.hora_salida}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Hora regreso</label>
                <input
                  name="hora_regreso"
                  value={form.hora_regreso}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          {/* =============================== */}
          {/* PRECIOS */}
          {/* =============================== */}
          <section className="section">
            <h2>Precios y pagos</h2>

            <div className="grid-3">
              <div className="form-group">
                <label>Subtotal</label>
                <input
                  type="number"
                  name="subtotal"
                  value={form.subtotal}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Descuento</label>
                <input
                  type="number"
                  name="descuento"
                  value={form.descuento}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Abonado</label>
                <input
                  type="number"
                  name="abonado"
                  value={form.abonado}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          {/* =============================== */}
          {/* TEXTO EXTRA */}
          {/* =============================== */}
          <section className="section">
            <h2>Texto adicional</h2>

            <div className="form-group full">
              <textarea
                name="texto_extra"
                value={form.texto_extra}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    texto_extra: e.target.value,
                  }))
                }
                placeholder="Notas, condiciones, detalles..."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}