import { Order, OrderUpdatePayload } from "@/services/orders";
import { useEffect, useState } from "react";
import "./OrderEditor.scss";

type OrderEditorProps = {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSaved: (payload: OrderUpdatePayload) => Promise<void>;
};

export default function OrderEditor({
  open,
  order,
  onClose,
  onSaved,
}: OrderEditorProps) {
  if (!open || !order) return null;

  const [form, setForm] = useState<Order>(order);

  useEffect(() => {
    if (order) {
      setForm(order);
    }
  }, [order]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    const numericFields = [
      "subtotal",
      "descuento",
      "abonado",
      "capacidadu",
    ];

    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name)
        ? value === "" ? null : Number(value)
        : value,
    }));
  }

  async function saveChanges() {
    const payload: OrderUpdatePayload = {
      nombre: form.nombre ?? undefined,
      fecha: form.fecha ?? undefined,
      direccion_salida: form.dir_salida ?? undefined,
      destino: form.dir_destino ?? undefined,
      hora_salida: form.hor_ida ?? undefined,
      hora_regreso: form.hor_regreso ?? undefined,
      capacidadu: form.capacidadu ?? undefined,
      subtotal: form.subtotal ?? undefined,
      descuento: form.descuento ?? undefined,
      abonado: form.abonado ?? undefined,
    };

    await onSaved(payload);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-body">
        <h2>Editar orden #{order.id}</h2>

        <label>Cliente</label>
        <input name="nombre" value={form.nombre ?? ""} onChange={handleChange} />

        <label>Fecha</label>
        <input name="fecha" value={form.fecha ?? ""} onChange={handleChange} />

        <label>Dirección salida</label>
        <input name="dir_salida" value={form.dir_salida ?? ""} onChange={handleChange} />

        <label>Destino</label>
        <input name="dir_destino" value={form.dir_destino ?? ""} onChange={handleChange} />

        <label>Hora ida</label>
        <input name="hor_ida" value={form.hor_ida ?? ""} onChange={handleChange} />

        <label>Hora regreso</label>
        <input name="hor_regreso" value={form.hor_regreso ?? ""} onChange={handleChange} />

        <hr />

        <label>Capacidad</label>
        <input
          type="number"
          name="capacidadu"
          value={form.capacidadu ?? ""}
          onChange={handleChange}
        />

        <label>Subtotal</label>
        <input
          type="number"
          name="subtotal"
          value={form.subtotal ?? ""}
          onChange={handleChange}
        />

        <label>Descuento</label>
        <input
          type="number"
          name="descuento"
          value={form.descuento ?? ""}
          onChange={handleChange}
        />

        <label>Abonado</label>
        <input
          type="number"
          name="abonado"
          value={form.abonado ?? ""}
          onChange={handleChange}
        />

        <div className="actions">
          <button className="btn-primary" onClick={saveChanges}>
            Guardar cambios
          </button>

          <button className="btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}