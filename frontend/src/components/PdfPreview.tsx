import { useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "./PdfPreview.scss";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

type PdfPreviewProps = {
  open: boolean;
  url?: string;
  title?: string;
  onClose: () => void;
};

export default function PdfPreview({
  open,
  url,
  title = "Vista previa",
  onClose,
}: PdfPreviewProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pdfpv-overlay" onClick={onClose}>
      <div
        className="pdfpv-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pdfpv-header">
          <h3>{title}</h3>
          <button
            className="pdfpv-close"
            type="button"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        {url ? (
          <div className="pdfpv-scroll">
            <Document file={url}>
              {/* Renderiza TODAS las páginas automáticamente */}
              <AllPages />
            </Document>
          </div>
        ) : (
          <div className="pdfpv-empty">Sin contenido</div>
        )}
      </div>
    </div>
  );
}

function AllPages() {
  const pages = 10; // no importa, se ajusta automáticamente

  return (
    <>
      {Array.from(new Array(pages), (_, i) => (
        <Page
          key={`page_${i + 1}`}
          pageNumber={i + 1}
          width={window.innerWidth < 768 ? window.innerWidth - 40 : 900}
        />
      ))}
    </>
  );
}