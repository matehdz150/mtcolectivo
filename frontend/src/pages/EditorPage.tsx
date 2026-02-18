import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  getOrderById,
  updateOrder,
  getExtraText,
  updateExtraText,
  deleteExtraText,
  Order,
  OrderUpdatePayload,
} from "@/services/orders";
import { sileo } from "sileo";
import "./EditorPage.scss";

export default function OrderEditPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get("id");

  const [form, setForm] = useState<Order | null>(null);
  const [textoExtra, setTextoExtra] = useState("");
  const [loading, setLoading] = useState(true);

  // ===============================
  // Cargar orden
  // ===============================
  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const data = await getOrderById(Number(id));
        setForm(data);

        const extra = await getExtraText(Number(id));
        setTextoExtra(extra.texto_extra ?? "");
      } catch {
        sileo.error({ title: "Error cargando orden" });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) return <div className="page-loading">Cargando...</div>;
  if (!form) return <div>No se encontró la orden</div>;

  // 🔒 Type narrowing definitivo
  const safeForm = form;

  // ===============================
  // Handlers
  // ===============================

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const numericFields = ["subtotal", "descuento", "abonado", "capacidadu"];

    setForm((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        [name]: numericFields.includes(name)
          ? value === ""
            ? null
            : Number(value)
          : value,
      };
    });
  }

  async function saveOrder() {
    if (!id) return;

    const payload: OrderUpdatePayload = {
      nombre: safeForm.nombre ?? undefined,
      fecha: safeForm.fecha ?? undefined,
      direccion_salida: safeForm.dir_salida ?? undefined,
      destino: safeForm.dir_destino ?? undefined,
      hora_salida: safeForm.hor_ida ?? undefined,
      hora_regreso: safeForm.hor_regreso ?? undefined,
      capacidadu: safeForm.capacidadu ?? undefined,
      subtotal: safeForm.subtotal ?? undefined,
      descuento: safeForm.descuento ?? undefined,
      abonado: safeForm.abonado ?? undefined,
    };

    await sileo.promise(updateOrder(Number(id), payload), {
      loading: { title: "Guardando orden..." },
      success: { title: "Orden actualizada" },
      error: { title: "Error al guardar" },
    });
  }

  async function saveExtraText() {
    if (!id) return;

    await sileo.promise(updateExtraText(Number(id), textoExtra), {
      loading: { title: "Guardando texto extra..." },
      success: { title: "Texto extra guardado" },
      error: { title: "Error al guardar texto" },
    });
  }

  async function removeExtraText() {
    if (!id) return;

    await sileo.promise(deleteExtraText(Number(id)), {
      loading: { title: "Eliminando texto..." },
      success: { title: "Texto eliminado" },
      error: { title: "Error al eliminar" },
    });

    setTextoExtra("");
  }

  return (
    <div className="order-layout">
      <div className="order-card">
        {/* HEADER */}
        <div className="order-header">
          <h1>Editar Orden #{safeForm.id}</h1>

          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => navigate("/orders")}
            >
              Cancelar
            </button>
            <button className="btn-primary" onClick={saveOrder}>
              Guardar
            </button>
          </div>
        </div>

        {/* ================= DATOS GENERALES ================= */}
        <section className="section">
          <h2>Detalles del servicio</h2>

          <div className="form-group full">
            <label>Nombre del cliente</label>
            <input
              name="nombre"
              value={safeForm.nombre ?? ""}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Fecha</label>
              <input
                name="fecha"
                value={safeForm.fecha ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Capacidad</label>
              <input
                type="number"
                name="capacidadu"
                value={safeForm.capacidadu ?? ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Dirección salida</label>
              <input
                name="dir_salida"
                value={safeForm.dir_salida ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Destino</label>
              <input
                name="dir_destino"
                value={safeForm.dir_destino ?? ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Hora ida</label>
              <input
                name="hor_ida"
                value={safeForm.hor_ida ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Hora regreso</label>
              <input
                name="hor_regreso"
                value={safeForm.hor_regreso ?? ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* ================= FINANZAS ================= */}
        <section className="section">
          <h2>Precios y pagos</h2>

          <div className="grid-3">
            <div className="form-group">
              <label>Subtotal</label>
              <input
                type="number"
                name="subtotal"
                value={safeForm.subtotal ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Descuento</label>
              <input
                type="number"
                name="descuento"
                value={safeForm.descuento ?? ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Abonado</label>
              <input
                type="number"
                name="abonado"
                value={safeForm.abonado ?? ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* ================= TEXTO EXTRA ================= */}
        <section className="section">
          <h2>Texto adicional (Segunda página)</h2>

          <div className="form-group full">
            <textarea
              value={textoExtra}
              onChange={(e) => setTextoExtra(e.target.value)}
              placeholder="Este texto se agregará como segunda hoja del PDF..."
            />
          </div>

          <div className="inline-actions">
            <button className="btn-primary" onClick={saveExtraText}>
              Guardar texto
            </button>
            <button className="btn-danger" onClick={removeExtraText}>
              Eliminar texto
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
