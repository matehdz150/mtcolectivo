import { useEffect, useRef, useState } from "react";
import { sileo } from "sileo";
import {
  updateExtraText,
  deleteExtraText,
} from "../services/orders";
import './OrderExtraText.scss'

type Props = {
  orderId: number;
  initialValue?: string;
};

export default function OrderExtraText({
  orderId,
  initialValue = "",
}: Props) {
  const [texto, setTexto] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===============================
  // 🟢 AUTO SAVE (3 segundos debounce)
  // ===============================
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        await updateExtraText(orderId, texto);
      } catch {
        sileo.error({ title: "Error guardando automáticamente" });
      } finally {
        setSaving(false);
      }
    }, 3000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [texto, orderId]);

  // ===============================
  // 📌 GENERADORES DE TEXTO
  // ===============================

  function addItinerario() {
    const template = `

DÍA 1 (__/__/____)
- Salida a las __:__ hrs rumbo a __________.
- Llegada aproximada a las __:__ hrs.

`;

    setTexto((prev) => prev + template);
  }

  function addDia(numero: number) {
    const template = `

DÍA ${numero} (__/__/____)
- Salida a las __:__ hrs rumbo a __________.
- Llegada aproximada a las __:__ hrs.

`;

    setTexto((prev) => prev + template);
  }

  function addParadaExtra() {
    const template = `

1 (___ pasajeros)
Unidad: __________
Ruta: __________
Ida: $ 0.00
Descuento: -$ 0.00
Total: $ 0.00

`;

    setTexto((prev) => prev + template);
  }

  async function handleDelete() {
    await sileo.promise(deleteExtraText(orderId), {
      loading: { title: "Eliminando texto..." },
      success: { title: "Texto eliminado" },
      error: { title: "Error al eliminar" },
    });

    setTexto("");
  }

  return (
    <section className="section">
      <div className="extra-header">
        <h2>Texto adicional (Segunda página)</h2>
        <div className="status">
          {saving ? "Guardando..." : "Guardado automático"}
        </div>
      </div>

      {/* BOTONES INTELIGENTES */}
      <div className="template-actions">
        <button className="btn-secondary" onClick={addItinerario}>
          Añadir itinerario
        </button>

        <button className="btn-secondary" onClick={() => addDia(2)}>
          Añadir Día
        </button>

        <button className="btn-secondary" onClick={addParadaExtra}>
          Añadir parada extra
        </button>

        <button className="btn-danger" onClick={handleDelete}>
          Limpiar todo
        </button>
      </div>

      <div className="form-group full">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe aquí el contenido adicional..."
        />
      </div>
    </section>
  );
}