# app/routers/orders.py
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import timezone
from app.database import SessionLocal
from app.models import Order
from app.deps import get_current_user          # ✅ protección JWT
from app.schemas import User

# ✅ Protección a nivel de router: TODAS las rutas requieren token
router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
    dependencies=[Depends(get_current_user)]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def serialize_order(o: Order) -> dict:
    """
    Serializa el modelo evitando _sa_instance_state y normalizando created_at.
    Si created_at no tiene tzinfo, la marcamos como UTC; si la tiene, la
    convertimos a UTC y devolvemos un ISO con 'Z' al final.
    """
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

# Acepta /orders y /orders/
@router.get("", response_model=list[dict])
@router.get("/", response_model=list[dict])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.id.desc()).all()
    return [serialize_order(o) for o in orders]

@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return Response(status_code=204)