import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Service, ServicePrice

SERVICES_DATA = [
    {
        "name": "Cantaritos",
        "slug": "cantaritos",
        "prices": [
            {"capacidad": 6, "period": "morning", "price_normal": 2500},
            {"capacidad": 14, "period": "morning", "price_normal": 5000},
            {"capacidad": 20, "period": "morning", "price_normal": 6000},
            {"capacidad": 45, "period": "morning", "price_normal": 9500},

            {"capacidad": 6, "period": "afternoon", "price_normal": 3000},
            {"capacidad": 14, "period": "afternoon", "price_normal": 5500},
            {"capacidad": 20, "period": "afternoon", "price_normal": 6500},
            {"capacidad": 45, "period": "afternoon", "price_normal": 10000},
        ]
    }
]

def run():
    db = SessionLocal()

    try:
        for service_data in SERVICES_DATA:

            service = (
                db.query(Service)
                .filter(Service.slug == service_data["slug"])
                .first()
            )

            if not service:
                service = Service(
                    name=service_data["name"],
                    slug=service_data["slug"],
                    active=True
                )
                db.add(service)
                db.commit()
                db.refresh(service)
                print(f"✔ Servicio creado: {service.slug}")

            for price_data in service_data["prices"]:

                existing = (
                    db.query(ServicePrice)
                    .filter(
                        ServicePrice.service_id == service.id,
                        ServicePrice.capacidad == price_data["capacidad"],
                        ServicePrice.period == price_data["period"]
                    )
                    .first()
                )

                if not existing:
                    price = ServicePrice(
                        service_id=service.id,
                        capacidad=price_data["capacidad"],
                        period=price_data["period"],
                        price_normal=price_data["price_normal"],
                        price_discount=0
                    )
                    db.add(price)
                    print(
                        f"   ➜ Precio agregado: {price_data['capacidad']} pax / {price_data['period']}"
                    )

        db.commit()
        print("\n✅ Seed completado correctamente")

    finally:
        db.close()


if __name__ == "__main__":
    run()