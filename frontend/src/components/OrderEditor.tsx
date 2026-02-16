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
  const [form, setForm] = useState<Order>(order as Order);

  useEffect(() => {
    if (order) {
      setForm(order);
    }
  }, [order]);

  if (!open || !order) return null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    setForm(
      (prev) =>
        ({
          ...prev,
          [name]: value,
        }) as Order,
    );
  }

  async function saveChanges() {
    const payload = {
      nombre: form.nombre ?? undefined,
      fecha: form.fecha ?? undefined,
      direccion_salida: form.dir_salida ?? undefined,
      destino: form.dir_destino ?? undefined,
      hora_salida: form.hor_ida ?? undefined,
      hora_regreso: form.hor_regreso ?? undefined,
    };

    await onSaved(payload);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-body">
        <h2>Editar orden #{order.id}</h2>

        <label>Cliente</label>
        <input
          name="nombre"
          value={form.nombre ?? ""}
          onChange={handleChange}
        />

        <label>Fecha</label>
        <input name="fecha" value={form.fecha ?? ""} onChange={handleChange} />

        <label>Dirección salida</label>
        <input
          name="dir_salida"
          value={form.dir_salida ?? ""}
          onChange={handleChange}
        />

        <label>Destino</label>
        <input
          name="dir_destino"
          value={form.dir_destino ?? ""}
          onChange={handleChange}
        />

        <label>Hora ida</label>
        <input
          name="hor_ida"
          value={form.hor_ida ?? ""}
          onChange={handleChange}
        />

        <label>Hora regreso</label>
        <input
          name="hor_regreso"
          value={form.hor_regreso ?? ""}
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
