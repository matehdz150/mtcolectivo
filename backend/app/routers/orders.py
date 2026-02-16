import re
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from app.services.pricing_engine import PricingEngine
from sqlalchemy.orm import Session
from datetime import timezone
import os
from sqlalchemy import text

from app.database import SessionLocal
from app.models import Order, Service
from app.deps import get_current_user
from app.schemas import User
import unicodedata

# ================================
# 🔐 API KEY para Google Forms
# ================================
FORM_API_KEY = os.getenv("FORM_API_KEY", "super-secret-key")


# ================================
# 🟢 ENDPOINT PÚBLICO PARA GOOGLE FORMS
# (NO requiere JWT)
# ================================
public_router = APIRouter(prefix="/orders", tags=["Orders – Public"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from datetime import datetime, timedelta

PRICE_TABLE = {
    6: 2500.00,
    14: 4500.00,
    20: 5500.00,
    45: 9500.00,
}

def assign_capacidad(pasajeros: int) -> int:
    if pasajeros <= 6:
        return 6
    elif pasajeros <= 14:
        return 14
    elif pasajeros <= 20:
        return 20
    else:
        return 45

def parse_time(value: str) -> datetime:
    """
    Parser ultra tolerante:
    - Soporta 12h y 24h
    - Limpia 'a.m.', 'am', 'AM', 'p.m.', 'pm'
    - Soporta casos inválidos como '17:33:00 am'
      → interpreta como 24h ignorando el sufijo
    """

    if not value:
        raise ValueError("Hora vacía")

    raw = value.strip().lower()
    raw = raw.replace("a.m.", "am").replace("p.m.", "pm").replace(".", "").strip()

    # Detecta si el usuario intentó usar AM/PM
    has_ampm = ("am" in raw) or ("pm" in raw)

    # Extraemos solo los números de la hora
    time_numbers = re.findall(r"\d+", raw)

    # Si el prefijo numérico es mayor que 12, NO puede ser 12h → 24h forzado
    try:
        hour = int(time_numbers[0])
        if hour > 12 and has_ampm:
            # limpiamos am/pm y tratamos como 24h
            raw_24 = re.sub(r"(am|pm)", "", raw).strip()
            formats_24 = ["%H:%M:%S", "%H:%M"]
            for fmt in formats_24:
                try:
                    return datetime.strptime(raw_24, fmt)
                except:
                    pass
    except:
        pass

    # ------- Intento normal 12h -------
    if has_ampm:
        raw2 = re.sub(r"(am|pm)$", r" \1", raw.replace(" ", ""))  # agrega espacio si falta
        for fmt in ["%I:%M:%S %p", "%I:%M %p", "%I %p"]:
            try:
                return datetime.strptime(raw2.upper(), fmt)
            except:
                pass

    # ------- Intento 24h -------
    for fmt in ["%H:%M:%S", "%H:%M"]:
        try:
            return datetime.strptime(raw, fmt)
        except:
            pass

    raise ValueError(f"Formato de hora no reconocido: '{value}'")

def is_cantaritos(destino: str) -> bool:
    destino = destino.lower()
    keywords = ["cantaritos", "amatitlan", "tequila"]
    return any(k in destino for k in keywords)


# TABLAS DE TARIFAS ESPECIALES
CANTARITOS_PRICES = {
    "morning": {   # 9am – 4pm
        6:  {"normal": 2500, "desc": 2250},
        14: {"normal": 5000, "desc": 4500},
        20: {"normal": 6000, "desc": 5500},
        45: {"normal": 9500, "desc": 9000},
    },
    "afternoon": {  # 1pm – 8pm
        6:  {"normal": 3000, "desc": 2500},
        14: {"normal": 5500, "desc": 5000},
        20: {"normal": 6500, "desc": 6000},
        45: {"normal": 10000, "desc": 9500},
    }
}


def determine_cantaritos_price(capacidad: int, hora_salida: str) -> float:
    t = parse_time(hora_salida)
    hour = t.hour

    # Determinar horario real
    if 9 <= hour < 12:
        period = "morning"
    elif 13 <= hour < 20:
        period = "afternoon"
    else:
        period = "morning"  # fallback

    price_info = CANTARITOS_PRICES.get(period, {}).get(capacidad)
    if not price_info:
        return 0.0

    return price_info["normal"]   # <<<<<<  🔥 ahora precio normal

@public_router.get("/fix-db")
def fix_db(db: Session = Depends(get_db)):

    db.execute(text("""
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS service_id INTEGER;
    """))

    db.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.table_constraints
                WHERE constraint_name = 'fk_orders_service'
            ) THEN
                ALTER TABLE orders
                ADD CONSTRAINT fk_orders_service
                FOREIGN KEY (service_id) REFERENCES services(id);
            END IF;
        END$$;
    """))

    db.commit()

    return {"status": "ok"}


def normalize(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return text


def resolve_service_by_destino(destino: str, db: Session):
    destino_norm = normalize(destino)

    services = db.query(Service).filter(Service.active == True).all()

    # 1️⃣ match por slug
    for service in services:
        if normalize(service.slug) in destino_norm:
            return service

    # 2️⃣ match por nombre
    for service in services:
        if normalize(service.name) in destino_norm:
            return service

    # 3️⃣ fallback seguro (primer servicio activo)
    if services:
        return services[0]

    return None

@public_router.post("/form-submit", include_in_schema=False)
def form_submit(request: Request, payload: dict, db: Session = Depends(get_db)):

    # ================================
    # 🔐 API KEY
    # ================================
    api_key = request.headers.get("x-api-key")
    if api_key != FORM_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # ================================
    # 📥 Datos del Form
    # ================================
    pasajeros = int(payload.get("personas", 0))
    hora_ida = payload.get("hora_salida")
    hora_reg = payload.get("hora_regreso")
    destino = payload.get("destino", "")

    if pasajeros <= 0:
        raise HTTPException(status_code=400, detail="Cantidad de pasajeros inválida")

    # ================================
    # 🔎 Resolver servicio automáticamente
    # ================================
    service = resolve_service_by_destino(destino, db)

    if not service:
        raise HTTPException(status_code=500, detail="No hay servicios configurados")

    # ================================
    # ⏱ Calcular duración
    # ================================
    try:
        t1 = datetime.strptime(hora_ida, "%H:%M")
        t2 = datetime.strptime(hora_reg, "%H:%M")
        duracion = (t2 - t1).total_seconds() / 3600
        if duracion < 0:
            duracion += 24
    except:
        duracion = 0.0

    # ================================
    # 💰 Pricing Engine
    # ================================
    engine = PricingEngine(db)

    subtotal, capacidad_asignada = engine.calculate(
        service_slug=service.slug,
        pasajeros=pasajeros,
        duracion_horas=duracion
    )

    if capacidad_asignada is None:
        raise HTTPException(status_code=400, detail="No hay capacidades configuradas")

    # ================================
    # 📝 Crear orden
    # ================================
    order = Order(
        service_id=service.id,
        nombre=payload.get("nombre"),
        fecha=payload.get("fecha"),
        dir_salida=payload.get("direccion_salida"),
        dir_destino=destino,
        hor_ida=hora_ida,
        hor_regreso=hora_reg,
        duracion=duracion,
        capacidadu=capacidad_asignada,
        subtotal=subtotal,
        descuento=0.0,
        total=subtotal,
        abonado=0.0,
        liquidar=subtotal
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    return {
        "status": "ok",
        "order_id": order.id,
        "service_resolved": service.slug,
        "capacidad_asignada": capacidad_asignada,
        "precio_total": subtotal
    }


# ================================
# 🔐 RUTAS PRIVADAS (requieren JWT)
# ================================
private_router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
    dependencies=[Depends(get_current_user)]
)

def serialize_order(o: Order) -> dict:
    if o.created_at:
        dt = o.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        created_iso = dt.isoformat(timespec="seconds").replace("+00:00", "Z")
    else:
        created_iso = None

    return {
        "id": o.id,
        "nombre": o.nombre,
        "fecha": o.fecha,
        "dir_salida": o.dir_salida,
        "dir_destino": o.dir_destino,
        "hor_ida": o.hor_ida,
        "hor_regreso": o.hor_regreso,
        "duracion": o.duracion,
        "capacidadu": o.capacidadu,
        "subtotal": o.subtotal,
        "descuento": o.descuento,
        "total": o.total,
        "abonado": o.abonado,
        "fecha_abono": o.fecha_abono,
        "liquidar": o.liquidar,
        "created_at": created_iso,
    }

@private_router.get("", response_model=list[dict])
@private_router.get("/", response_model=list[dict])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.id.desc()).all()
    return [serialize_order(o) for o in orders]

@private_router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return Response(status_code=204)

@private_router.post("/{order_id}/toggle-discount")
def toggle_discount(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Si descuento = 0 → aplicar descuento recomendado (10%)
    # Si descuento > 0 → quitar descuento
    if order.descuento == 0:
        order.descuento = order.subtotal * 0.10  # 10% descuento
    else:
        order.descuento = 0

    order.total = order.subtotal - order.descuento
    order.liquidar = order.total - order.abonado

    db.commit()
    db.refresh(order)
    return serialize_order(order)

@private_router.post("/{order_id}/add-payment")
def add_payment(order_id: int, amount: float, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="El abono debe ser mayor a 0")

    order.abonado += amount
    order.liquidar = order.total - order.abonado

    db.commit()
    db.refresh(order)
    return serialize_order(order)

@private_router.post("/{order_id}/reset-payment")
def reset_payment(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.abonado = 0
    order.liquidar = order.total

    db.commit()
    db.refresh(order)
    return serialize_order(order)

@private_router.put("/{order_id}")
def update_order(order_id: int, payload: dict, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # ================================
    # Actualizar campos básicos
    # ================================
    order.nombre = payload.get("nombre", order.nombre)
    order.fecha = payload.get("fecha", order.fecha)
    order.dir_salida = payload.get("direccion_salida", order.dir_salida)
    order.dir_destino = payload.get("destino", order.dir_destino)
    order.hor_ida = payload.get("hora_salida", order.hor_ida)
    order.hor_regreso = payload.get("hora_regreso", order.hor_regreso)

    # ================================
    # Recalcular duración (si cambian horas)
    # ================================
    try:
        if order.hor_ida and order.hor_regreso:
            t1 = parse_time(order.hor_ida)
            t2 = parse_time(order.hor_regreso)
            duracion = (t2 - t1).total_seconds() / 3600
            if duracion < 0:
                duracion += 24
            order.duracion = duracion
    except:
        pass

    # ================================
    # Capacidad (editable también)
    # ================================
    if "capacidadu" in payload:
        order.capacidadu = int(payload["capacidadu"])
    elif "personas" in payload:
        order.capacidadu = assign_capacidad(int(payload["personas"]))

    # ================================
    # SUBTOTAL editable
    # ================================
    if "subtotal" in payload:
        order.subtotal = float(payload["subtotal"])
    else:
        engine = PricingEngine(db)
        service = db.get(Service, order.service_id)

        if service:
            subtotal, capacidad_asignada = engine.calculate(
                service_slug=service.slug,
                pasajeros=order.capacidadu,
                hora=order.hor_ida
            )
            order.capacidadu = capacidad_asignada
            order.subtotal = subtotal
        else:
            order.subtotal = 0

    # ================================
    # Descuento editable
    # ================================
    if "descuento" in payload:
        order.descuento = float(payload["descuento"])

    # ================================
    # Abonado editable
    # ================================
    if "abonado" in payload:
        order.abonado = float(payload["abonado"])

    # ================================
    # Recalcular totales SIEMPRE
    # ================================
    order.total = (order.subtotal or 0) - (order.descuento or 0)
    order.liquidar = order.total - (order.abonado or 0)

    db.commit()
    db.refresh(order)

    return serialize_order(order)

from sqlalchemy import func, desc
from datetime import datetime

@private_router.get("/stats")
def get_orders_stats(db: Session = Depends(get_db)):

    # ================================
    # 📦 Totales generales
    # ================================

    total_orders = db.query(func.count(Order.id)).scalar() or 0

    total_facturado = db.query(func.sum(Order.total)).scalar() or 0
    total_abonado = db.query(func.sum(Order.abonado)).scalar() or 0
    total_pendiente = db.query(func.sum(Order.liquidar)).scalar() or 0
    ingresos_brutos = db.query(func.sum(Order.subtotal)).scalar() or 0
    total_descuentos = db.query(func.sum(Order.descuento)).scalar() or 0

    ticket_promedio = (
        total_facturado / total_orders
        if total_orders > 0 else 0
    )

    porcentaje_prom_descuento = (
        (total_descuentos / ingresos_brutos) * 100
        if ingresos_brutos > 0 else 0
    )

    # ================================
    # 🚐 Capacidad más solicitada
    # ================================

    capacidad_top = (
        db.query(Order.capacidadu, func.count(Order.id).label("count"))
        .group_by(Order.capacidadu)
        .order_by(desc("count"))
        .first()
    )

    capacidad_mas_solicitada = capacidad_top[0] if capacidad_top else None

    # ================================
    # 📍 Destino más frecuente
    # ================================

    destino_top = (
        db.query(Order.dir_destino, func.count(Order.id).label("count"))
        .group_by(Order.dir_destino)
        .order_by(desc("count"))
        .first()
    )

    destino_mas_frecuente = destino_top[0] if destino_top else None

    # ================================
    # 📅 Mes actual
    # ================================

    now = datetime.utcnow()

    ordenes_mes_actual = (
        db.query(func.count(Order.id))
        .filter(
            func.extract("month", Order.created_at) == now.month,
            func.extract("year", Order.created_at) == now.year
        )
        .scalar()
        or 0
    )

    ingresos_mes_actual = (
        db.query(func.sum(Order.total))
        .filter(
            func.extract("month", Order.created_at) == now.month,
            func.extract("year", Order.created_at) == now.year
        )
        .scalar()
        or 0
    )

    # ================================
    # 🎯 Response
    # ================================

    return {
        "finanzas": {
            "total_facturado": round(total_facturado, 2),
            "total_abonado": round(total_abonado, 2),
            "total_pendiente": round(total_pendiente, 2),
            "ingresos_brutos": round(ingresos_brutos, 2),
            "total_descuentos": round(total_descuentos, 2),
            "ticket_promedio": round(ticket_promedio, 2),
            "porcentaje_promedio_descuento": round(porcentaje_prom_descuento, 2),
        },
        "operacion": {
            "total_ordenes": total_orders,
            "capacidad_mas_solicitada": capacidad_mas_solicitada,
            "destino_mas_frecuente": destino_mas_frecuente,
        },
        "mes_actual": {
            "ordenes": ordenes_mes_actual,
            "ingresos": round(ingresos_mes_actual, 2),
        }
    }