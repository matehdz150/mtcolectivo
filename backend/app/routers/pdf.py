# app/routers/pdf.py
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlalchemy.orm import Session
from io import BytesIO
import os
import subprocess
import re
from typing import Any, Dict

from app.database import SessionLocal
from app.models import Order
from app.main_utils import (
    read_first_row_from_excel,
    build_mapping_from_row,
    generate_pdf_from_template,
)
from app.deps import get_current_user   # ✅ rutas protegidas
from app.schemas import User            # (payload del usuario autenticado)

router = APIRouter(prefix="/pdf", tags=["PDF"])

# ---- DB dependency ----
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- Helpers ----
_num_re = re.compile(r"[^\d\-,.\s]")

def parse_num(val: Any) -> float:
    """
    Convierte a float tolerando '1,500', '1 500', '$1,500.00', etc.
    Vacíos o None => 0.0
    """
    if val is None:
        return 0.0
    s = str(val).strip()
    if not s:
        return 0.0
    s = _num_re.sub("", s)
    s = s.replace(" ", "")
    if "," in s and "." in s:
        s = s.replace(",", "")
    elif "," in s and "." not in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# POST /pdf/from-excel  → Genera PDF + guarda la orden en DB
# Usa &SUBTOTAL&, &DESCUENTO&, &ABONADO& para calcular:
#   TOTAL   = SUBTOTAL - DESCUENTO
#   LIQUIDAR = TOTAL - ABONADO
# Y en la plantilla rellena &SUBTOTAL&, &TOTAL&, &LIQUIDAR& (además de los demás).
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/from-excel")
async def pdf_from_excel(
    file: UploadFile = File(...),
    sheet: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # ✅ protegido
):
    try:
        xls_bytes = await file.read()
        row = read_first_row_from_excel(xls_bytes, sheet_name=sheet)
        mapping = build_mapping_from_row(row)

        # --- números base ---
        subtotal  = parse_num(mapping.get("&SUBTOTAL&"))
        descuento = parse_num(mapping.get("&DESCUENTO&"))
        abonado   = parse_num(mapping.get("&ABONADO&"))

        total    = subtotal - descuento
        liquidar = total - abonado

        # asegúrate de que la plantilla reciba estos tokens actualizados
        mapping["&SUBTOTAL&"] = f"{subtotal:.2f}"
        mapping["&TOTAL&"]    = f"{total:.2f}"
        mapping["&LIQUIDAR&"] = f"{liquidar:.2f}"

        # --- generar PDF ---
        pdf_bytes = generate_pdf_from_template(mapping)

        # --- guardar orden ---
        order = Order(
            nombre=mapping.get("&NOMBRE&"),
            fecha=mapping.get("&FECHA&"),
            dir_salida=mapping.get("&DIR_SALIDA&"),
            dir_destino=mapping.get("&DIR_DESTINO&"),
            hor_ida=mapping.get("&HOR_IDA&"),
            hor_regreso=mapping.get("&HOR_REGRESO&"),
            duracion=mapping.get("&DURACION&"),
            capacidadu=mapping.get("&CAPACIDADU&"),
            subtotal=subtotal,           # 👈 nuevo campo
            descuento=descuento,
            total=total,                 # 👈 total final ya con descuento
            abonado=abonado,
            fecha_abono=mapping.get("&FECHA_ABONO&"),
            liquidar=liquidar,
        )
        db.add(order)
        db.commit()

        filename = f'orden_{os.path.splitext(file.filename or "archivo")[0]}.pdf'
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except subprocess.CalledProcessError as e:
        return PlainTextResponse(
            f"Error LibreOffice: {e.stderr.decode('utf-8', errors='ignore')}",
            status_code=500,
        )
    except Exception as e:
        return PlainTextResponse(str(e), status_code=500)


# ─────────────────────────────────────────────────────────────────────────────
# POST /pdf/from-data  → Genera PDF desde JSON (NO guarda en DB)
# Si te pasan subtotal/desc/abonado, recalculamos total y liquidar.
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/from-data")
async def pdf_from_data(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    try:
        def g(d: Dict[str, Any], k: str) -> str:
            for cand in (k, k.lower(), k.upper()):
                if cand in d:
                    v = d[cand]
                    return "" if v is None else str(v)
            return ""

        # leemos strings
        s_subtotal  = g(data, "subtotal") or g(data, "SUBTOTAL")
        s_descuento = g(data, "descuento")
        s_abonado   = g(data, "abonado")

        # parseamos y recalculamos (si no hay datos, 0)
        subtotal  = parse_num(s_subtotal)
        descuento = parse_num(s_descuento)
        abonado   = parse_num(s_abonado)
        total     = subtotal - descuento
        liquidar  = total - abonado
        

        mapping = {
            "&NOMBRE&": g(data, "nombre"),
            "&FECHA&": g(data, "fecha"),
            "&DIR_SALIDA&": g(data, "dir_salida"),
            "&DIR_DESTINO&": g(data, "dir_destino"),
            "&HOR_IDA&": g(data, "hor_ida"),
            "&HOR_REGRESO&": g(data, "hor_regreso"),
            "&DURACION&": g(data, "duracion"),
            "&CAPACIDADU&": g(data, "capacidadu"),

            # números formateados
            "&SUBTOTAL&": f"{subtotal:.2f}",
            "&DESCUENTO&": f"{descuento:.2f}",
            "&TOTAL&": f"{total:.2f}",
            "&ABONADO&": f"{abonado:.2f}",
            "&FECHA_ABONO&": g(data, "fecha_abono"),
            "&LIQUIDAR&": f"{liquidar:.2f}",
        }

        pdf_bytes = generate_pdf_from_template(mapping)
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="orden.pdf"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
from docx import Document
from io import BytesIO

def _replace_tokens_in_paragraph(paragraph, mapping: dict) -> None:
    # Une runs -> reemplaza sobre el texto completo -> reescribe
    full = "".join(run.text for run in paragraph.runs)
    if not full:
        return

    changed = False
    for key, value in mapping.items():
        if key in full:
            full = full.replace(key, value)
            changed = True

    if not changed:
        return

    # Limpia todos los runs y deja el texto en el primero
    for run in paragraph.runs:
        run.text = ""
    paragraph.runs[0].text = full


def generate_docx_from_template(mapping: dict) -> bytes:
    doc = Document("PlantillaOrden.docx")

    # Párrafos normales
    for paragraph in doc.paragraphs:
        _replace_tokens_in_paragraph(paragraph, mapping)

    # Tablas (las celdas tienen párrafos)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    _replace_tokens_in_paragraph(paragraph, mapping)

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()
    
@router.post("/from-data-word")
async def word_from_data(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    try:
        def g(d: Dict[str, Any], k: str) -> str:
            for cand in (k, k.lower(), k.upper()):
                if cand in d:
                    v = d[cand]
                    return "" if v is None else str(v)
            return ""

        # ========= Leer valores =========
        s_subtotal  = g(data, "subtotal")
        s_descuento = g(data, "descuento")
        s_abonado   = g(data, "abonado")

        subtotal  = parse_num(s_subtotal)
        descuento = parse_num(s_descuento)
        abonado   = parse_num(s_abonado)

        total    = subtotal - descuento
        liquidar = total - abonado

        mapping = {
            "&NOMBRE&": g(data, "nombre"),
            "&FECHA&": g(data, "fecha"),
            "&DIR_SALIDA&": g(data, "dir_salida"),
            "&DIR_DESTINO&": g(data, "dir_destino"),
            "&HOR_IDA&": g(data, "hor_ida"),
            "&HOR_REGRESO&": g(data, "hor_regreso"),
            "&DURACION&": g(data, "duracion"),
            "&CAPACIDADU&": g(data, "capacidadu"),
            "&SUBTOTAL&": f"{subtotal:.2f}",
            "&DESCUENTO&": f"{descuento:.2f}",
            "&TOTAL&": f"{total:.2f}",
            "&ABONADO&": f"{abonado:.2f}",
            "&FECHA_ABONO&": g(data, "fecha_abono"),
            "&LIQUIDAR&": f"{liquidar:.2f}",
        }

        docx_bytes = generate_docx_from_template(mapping)

        return StreamingResponse(
            BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": 'attachment; filename="orden.docx"'
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))