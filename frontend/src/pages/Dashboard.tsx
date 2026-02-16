// src/pages/Dashboard.tsx
// …tus imports tal cual
import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import Modal, { type ModalStatus } from "../components/Modal";
import PdfPreview from "../components/PdfPreview";
import { uploadExcel, ApiError, authFetch, API_BASE } from "../services/api";
import OrderEditor from "../components/OrderEditor";
import {
  deleteOrder,
  fetchOrders,
  OrderUpdatePayload,
  pdfFromData,
  updateOrder,
  wordFromData,
  type Order,
} from "../services/orders";
import "./Dashboard.scss";
import { DownloadIcon, EyeIcon, TrashIcon } from "../components/Icons";
import { useAuth } from "../contexts/AuthContext";
import { ArrowDown, ArrowUp, Calendar, DollarSign, Search, SlidersHorizontal, Users } from "lucide-react";

type ApiState = "idle" | "loading" | "done" | "error";

const fmtMoney = (n: number | null) =>
  n === null
    ? "-"
    : n.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      });

export default function Dashboard() {
  const { isAuth } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Abre el modal de edición
  function openEditor(order: any) {
    setEditingOrder(order);
    setEditorOpen(true);
  }

  // Cerrar editor
  function closeEditor() {
    setEditorOpen(false);
    setEditingOrder(null);
  }

  // 👇 NUEVO: key para forzar remount del input tras cada uso
  const [inputKey, setInputKey] = useState(0);

  const [status, setStatus] = useState<ApiState>("idle");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>("loading");
  const [modalTitle, setModalTitle] = useState("Procesando…");
  const [modalMsg, setModalMsg] = useState(
    "Estamos generando tu PDF. Esto puede tardar unos segundos.",
  );

  const [uploadPdfUrl, setUploadPdfUrl] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  async function loadOrders() {
    try {
      setLoadingOrders(true);
      const res = await authFetch(`${API_BASE}/orders`);
      const data = await res.json();
      setOrders(data);
      console.log(data);
    } catch (err) {
      console.error("Error cargando órdenes:", err);
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const openPicker = () => {
    if (!isAuth) {
      setModalStatus("error");
      setModalTitle("Sesión requerida");
      setModalMsg("Inicia sesión para subir un Excel.");
      setModalOpen(true);
      return;
    }
    fileRef.current?.click();
  };

  useEffect(() => {
    if (!isAuth) return;
    const ac = new AbortController();
    (async () => {
      setLoadingOrders(true);
      try {
        const data = await fetchOrders(ac.signal);
        setOrders(data);
      } finally {
        setLoadingOrders(false);
      }
    })();
    return () => ac.abort();
  }, [isAuth]);

  useEffect(() => {
    return () => {
      if (uploadPdfUrl) URL.revokeObjectURL(uploadPdfUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [uploadPdfUrl, previewUrl]);

  const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    console.log("[uploader] change fired. file:", file?.name);
    if (!file) return;

    if (!isAuth) {
      setModalStatus("error");
      setModalTitle("Sesión requerida");
      setModalMsg("Inicia sesión para subir un Excel.");
      setModalOpen(true);
      return;
    }

    const ac = new AbortController();
    try {
      setStatus("loading");
      setMessage("Procesando…");

      setModalStatus("loading");
      setModalTitle("Procesando…");
      setModalMsg("Estamos generando tu PDF. Esto puede tardar unos segundos.");
      setModalOpen(true);

      const pdfBlob = await uploadExcel(file, "Sheet1", ac.signal);
      const url = URL.createObjectURL(pdfBlob);

      if (uploadPdfUrl) URL.revokeObjectURL(uploadPdfUrl);
      setUploadPdfUrl(url);

      setStatus("done");
      setMessage("PDF generado correctamente.");
      setModalStatus("done");
      setModalTitle("Vista previa");
      setModalMsg("Revisa el PDF. Puedes descargarlo si todo luce bien.");

      const data = await fetchOrders(ac.signal);
      setOrders(data);
    } catch (err) {
      const apiErr = err as ApiError;
      const msg =
        apiErr?.status === 401
          ? "Sesión expirada. Vuelve a iniciar sesión."
          : apiErr?.message || "Error al generar PDF";

      setStatus("error");
      setMessage(msg);
      setModalStatus("error");
      setModalTitle(
        apiErr?.status === 401 ? "Sesión expirada" : "Ocurrió un problema",
      );
      setModalMsg(msg);
    } finally {
      // 👇 Fuerza remount del input para que el próximo change SIEMPRE dispare
      setInputKey((k) => k + 1);
    }
  };

  const openPreview = async (order: Order) => {
    if (!isAuth) return;
    const ac = new AbortController();
    setModalStatus("loading");
    setModalTitle("Abriendo vista previa…");
    setModalMsg("Preparando el documento.");
    setModalOpen(true);

    try {
      const pdf = await pdfFromData(order, ac.signal);
      const url = URL.createObjectURL(pdf);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setPreviewOpen(true);
      setModalOpen(false);
    } catch (e: any) {
      setModalStatus("error");
      setModalTitle(
        e?.status === 401
          ? "Sesión expirada"
          : "No se pudo abrir la vista previa",
      );
      setModalMsg(
        e?.status === 401
          ? "Vuelve a iniciar sesión."
          : e?.message || "Error desconocido",
      );
      setModalOpen(true);
    }
  };

  const downloadFromOrder = async (order: Order) => {
    if (!isAuth) return;

    const ac = new AbortController();

    setModalStatus("loading");
    setModalTitle("Generando archivos…");
    setModalMsg("Estamos preparando tu PDF y Word.");
    setModalOpen(true);

    try {
      // ========================
      // 1️⃣ Descargar PDF
      // ========================
      const pdfBlob = await pdfFromData(order, ac.signal);
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const pdfLink = document.createElement("a");
      pdfLink.href = pdfUrl;
      pdfLink.download = `orden_${order.id}.pdf`;
      document.body.appendChild(pdfLink);
      pdfLink.click();
      document.body.removeChild(pdfLink);
      URL.revokeObjectURL(pdfUrl);

      // ========================
      // Final UI
      // ========================
      setModalStatus("done");
      setModalTitle("¡Listo!");
      setModalMsg("Se descargaron el PDF y el Word correctamente.");
      setTimeout(() => setModalOpen(false), 1200);
    } catch (e: any) {
      setModalStatus("error");
      setModalTitle(
        e?.status === 401 ? "Sesión expirada" : "No se pudo descargar",
      );
      setModalMsg(
        e?.status === 401
          ? "Vuelve a iniciar sesión."
          : e?.message || "Error desconocido",
      );
    }
  };

  const removeOrder = async (o: Order) => {
    if (!isAuth) return;
    if (!confirm(`¿Eliminar la orden #${o.id}?`)) return;
    const ac = new AbortController();
    try {
      await deleteOrder(o.id, ac.signal);
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
    } catch (e: any) {
      setModalStatus("error");
      setModalTitle(
        e?.status === 401 ? "Sesión expirada" : "No se pudo eliminar",
      );
      setModalMsg(
        e?.status === 401
          ? "Vuelve a iniciar sesión."
          : e?.message || "Error desconocido",
      );
      setModalOpen(true);
    }
  };

  const handleCloseStateModal = () => setModalOpen(false);
  const downloadUploadedPdf = () => {
    if (!uploadPdfUrl) return;
    const a = document.createElement("a");
    a.href = uploadPdfUrl;
    a.download = "orden.pdf";
    a.click();
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };
  //filtrado
  type SortField = "fecha" | "nombre" | "total";
  type SortDir = "asc" | "desc";

  const [filters, setFilters] = useState({
    name: "",
    dateFrom: "",
    dateTo: "",
    minTotal: "",
    maxTotal: "",
    sortField: "fecha" as SortField,
    sortDir: "desc" as SortDir,
    minCapacidad: "",
    maxCapacidad: "",
  });
  //filtrado

  const filteredOrders = orders
    .filter((o) => {
      const total = Number(o.total ?? 0);
      const capacidad = Number(o.capacidadu ?? 0);
      const createdAt = new Date(o.created_at);

      // Nombre
      if (
        filters.name &&
        !o.nombre?.toLowerCase().includes(filters.name.toLowerCase())
      ) {
        return false;
      }

      // Total mínimo
      if (filters.minTotal && total < Number(filters.minTotal)) {
        return false;
      }

      // Total máximo
      if (filters.maxTotal && total > Number(filters.maxTotal)) {
        return false;
      }

      // Capacidad mínima (pasajeros)
      if (filters.minCapacidad && capacidad < Number(filters.minCapacidad)) {
        return false;
      }

      // Capacidad máxima (pasajeros)
      if (filters.maxCapacidad && capacidad > Number(filters.maxCapacidad)) {
        return false;
      }

      // Fecha desde
      if (filters.dateFrom) {
        if (createdAt < new Date(filters.dateFrom)) return false;
      }

      // Fecha hasta
      if (filters.dateTo) {
        if (createdAt > new Date(filters.dateTo)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let result = 0;

      if (filters.sortField === "fecha") {
        result =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      if (filters.sortField === "nombre") {
        result = (a.nombre || "").localeCompare(b.nombre || "");
      }

      if (filters.sortField === "total") {
        result = Number(a.total ?? 0) - Number(b.total ?? 0);
      }

      return filters.sortDir === "asc" ? result : -result;
    });

  return (
    <div className="dashboard">
      <Sidebar onUploadClick={openPicker} />

      <main className="content">
        <header className="content-header">
          <h2>Generador de Órdenes</h2>
          <p>Revisa las órdenes existentes.</p>
        </header>

        <section className="orders-filters">
  <div className="filters-row filters-row--primary">

    {/* 🔎 BÚSQUEDA */}
    <div className="filter search">
      <Search size={16} />
      <input
        type="text"
        placeholder="Buscar cliente o ID…"
        value={filters.name}
        onChange={(e) =>
          setFilters({ ...filters, name: e.target.value })
        }
      />
    </div>

    {/* 🔃 ORDENAMIENTO */}
    <div className="filter sort">
      <SlidersHorizontal size={16} />

      <select
        value={filters.sortField}
        onChange={(e) =>
          setFilters({
            ...filters,
            sortField: e.target.value as SortField,
          })
        }
      >
        <option value="fecha">Fecha</option>
        <option value="nombre">Cliente</option>
        <option value="total">Monto</option>
      </select>

      <button
        className="btn-sort"
        onClick={() =>
          setFilters({
            ...filters,
            sortDir: filters.sortDir === "asc" ? "desc" : "asc",
          })
        }
      >
        {filters.sortDir === "asc" ? (
          <>
            <ArrowUp size={14} /> Asc
          </>
        ) : (
          <>
            <ArrowDown size={14} /> Desc
          </>
        )}
      </button>
    </div>
  </div>

  {/* 📊 FILTROS SECUNDARIOS */}
  <div className="filters-row filters-row--secondary">

    <div className="filter">
      <Calendar size={15} />
      <input
        type="date"
        value={filters.dateFrom}
        onChange={(e) =>
          setFilters({ ...filters, dateFrom: e.target.value })
        }
        title="Desde"
      />
    </div>

    <div className="filter">
      <Calendar size={15} />
      <input
        type="date"
        value={filters.dateTo}
        onChange={(e) =>
          setFilters({ ...filters, dateTo: e.target.value })
        }
        title="Hasta"
      />
    </div>

    <div className="filter">
      <DollarSign size={15} />
      <input
        type="number"
        placeholder="Monto mín."
        value={filters.minTotal}
        onChange={(e) =>
          setFilters({ ...filters, minTotal: e.target.value })
        }
      />
    </div>

    <div className="filter">
      <DollarSign size={15} />
      <input
        type="number"
        placeholder="Monto máx."
        value={filters.maxTotal}
        onChange={(e) =>
          setFilters({ ...filters, maxTotal: e.target.value })
        }
      />
    </div>

    <div className="filter">
      <Users size={15} />
      <input
        type="number"
        placeholder="Pasajeros mín."
        value={filters.minCapacidad}
        onChange={(e) =>
          setFilters({ ...filters, minCapacidad: e.target.value })
        }
      />
    </div>

    <div className="filter">
      <Users size={15} />
      <input
        type="number"
        placeholder="Pasajeros máx."
        value={filters.maxCapacidad}
        onChange={(e) =>
          setFilters({ ...filters, maxCapacidad: e.target.value })
        }
      />
    </div>
  </div>
</section>

        {/* ===== ÓRDENES: Tabla Pro ===== */}
        <section className="orders-pro">
          <h3>Órdenes recientes</h3>

          {/* Encabezado fijo */}
          <div className="orders-pro__head">
            <div className="col col--cliente">Cliente</div>
            <div className="col col--total">Total</div>
            <div className="col col--acciones">Acciones</div>
          </div>

          {/* Área scrolleable */}
          <div className="orders-pro__body">
            {loadingOrders && (
              <div className="orders-pro__empty">Cargando…</div>
            )}
            {!loadingOrders && orders.length === 0 && (
              <div className="orders-pro__empty">Aún no hay órdenes.</div>
            )}

            {filteredOrders.map((o, idx) => (
              <div
                key={o.id}
                className={`orders-pro__row ${idx % 2 ? "is-alt" : ""}`}
              >
                <div
                  className="cell cell--cliente"
                  onClick={() => openPreview(o)}
                >
                  <div className="name">{o.nombre || "Sin nombre"}</div>
                  <div className="meta">
                    <span>#{o.id}</span>
                    <span className="dot">•</span>
                    <span>{fmtDate(o.created_at)}</span>
                    <span className="dot">•</span>
                    <span>
                      {new Date(o.created_at).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="cell cell--total">
                  <span className="money">{fmtMoney(o.total)}</span>
                </div>

                <div className="cell cell--acciones">
                  <button
                    className="icon-chip"
                    onClick={() => openPreview(o)}
                    aria-label="Vista previa"
                  >
                    <EyeIcon size="1rem" />
                  </button>

                  <button
                    className="icon-chip"
                    onClick={() => downloadFromOrder(o)}
                    aria-label="Descargar"
                  >
                    <DownloadIcon size="1rem" />
                  </button>

                  <button
                    className="icon-chip"
                    onClick={() => openEditor(o)}
                    aria-label="Editar"
                  >
                    ✏️
                  </button>

                  <button
                    className="icon-chip danger"
                    onClick={() => removeOrder(o)}
                    aria-label="Eliminar"
                  >
                    <TrashIcon size="1rem" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {editorOpen && editingOrder && (
        <OrderEditor
          open={editorOpen}
          order={editingOrder}
          onClose={closeEditor}
          onSaved={async (updatedData: OrderUpdatePayload) => {
            try {
              await updateOrder(editingOrder.id, updatedData);
              await loadOrders();
              closeEditor();
            } catch (err) {
              console.error("Error actualizando orden:", err);
            }
          }}
        />
      )}

      <Modal
        open={modalOpen}
        status={modalStatus}
        title={modalTitle}
        message={modalMsg}
        onClose={handleCloseStateModal}
        children={
          modalStatus === "done" && uploadPdfUrl ? (
            <div className="pdf-preview">
              <iframe
                className="pdf-embed"
                src={uploadPdfUrl}
                title="Vista previa PDF"
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            </div>
          ) : undefined
        }
        actions={
          modalStatus === "done" && uploadPdfUrl ? (
            <>
              <button
                type="button"
                className="btn"
                onClick={handleCloseStateModal}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={downloadUploadedPdf}
              >
                Descargar
              </button>
            </>
          ) : modalStatus !== "loading" ? (
            <button
              type="button"
              className="btn"
              onClick={handleCloseStateModal}
            >
              Cerrar
            </button>
          ) : undefined
        }
      />

      <PdfPreview
        open={previewOpen}
        url={previewUrl}
        title="Vista previa"
        onClose={() => {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(undefined);
          setPreviewOpen(false);
        }}
      />
    </div>
  );
}
