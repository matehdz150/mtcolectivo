from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models import ServicePrice, Service
from app.database import SessionLocal
from app.deps import get_current_user
from seed import run as run_seed


seed_router = APIRouter(
    prefix="/seed",
    tags=["Seed"]
)

@seed_router.post("/prices")
def seed_prices():
    run_seed()
    return {"status": "seed executed"}

price_router = APIRouter(
    prefix="/service-prices",
    tags=["Service Prices"],
    dependencies=[Depends(get_current_user)]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@price_router.post("")
def create_price(payload: dict, db: Session = Depends(get_db)):

    service = db.get(Service, payload.get("service_id"))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    price = ServicePrice(
        service_id=payload["service_id"],
        capacidad=payload["capacidad"],
        period=payload["period"],
        price_normal=payload["price_normal"],
        price_discount=payload.get("price_discount")
    )

    db.add(price)
    db.commit()
    db.refresh(price)

    return price

@price_router.get("")
def list_prices(service_id: int, db: Session = Depends(get_db)):
    return (
        db.query(ServicePrice)
        .filter(ServicePrice.service_id == service_id)
        .order_by(ServicePrice.capacidad.asc())
        .all()
    )

@price_router.put("/{price_id}")
def update_price(price_id: int, payload: dict, db: Session = Depends(get_db)):

    price = db.get(ServicePrice, price_id)
    if not price:
        raise HTTPException(status_code=404, detail="Price not found")

    price.capacidad = payload.get("capacidad", price.capacidad)
    price.period = payload.get("period", price.period)
    price.price_normal = payload.get("price_normal", price.price_normal)
    price.price_discount = payload.get("price_discount", price.price_discount)

    db.commit()
    db.refresh(price)

    return price

@price_router.delete("/{price_id}")
def delete_price(price_id: int, db: Session = Depends(get_db)):

    price = db.get(ServicePrice, price_id)
    if not price:
        raise HTTPException(status_code=404, detail="Price not found")

    db.delete(price)
    db.commit()

    return {"status": "deleted"}