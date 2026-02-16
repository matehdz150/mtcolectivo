import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Service, ServicePrice

SERVICES_DATA = [

    # ================================
    # MAZATLÁN
    # ================================
    {
        "name": "Mazatlán",
        "slug": "mazatlan",
        "prices": [
            # 6 pax
            {"capacidad": 6, "period": "weekend", "price_normal": 12500},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 13500},

            # 14 pax
            {"capacidad": 14, "period": "weekend", "price_normal": 17500},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 18000},

            # 20 pax
            {"capacidad": 20, "period": "weekend", "price_normal": 20500},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 21500},
        ]
    },

    # ================================
    # PTO VALLARTA
    # ================================
    {
        "name": "Puerto Vallarta",
        "slug": "pto-vallarta",
        "prices": [
            {"capacidad": 6, "period": "same_day", "price_normal": 9500},
            {"capacidad": 6, "period": "weekend", "price_normal": 10500},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 11500},

            {"capacidad": 14, "period": "same_day", "price_normal": 12500},
            {"capacidad": 14, "period": "weekend", "price_normal": 13500},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 14500},

            {"capacidad": 20, "period": "same_day", "price_normal": 14000},
            {"capacidad": 20, "period": "weekend", "price_normal": 15000},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 16000},
        ]
    },

    # ================================
    # MANZANILLO
    # ================================
    {
        "name": "Manzanillo",
        "slug": "manzanillo",
        "prices": [
            {"capacidad": 6, "period": "same_day", "price_normal": 8500},
            {"capacidad": 6, "period": "weekend", "price_normal": 9500},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 10500},

            {"capacidad": 14, "period": "same_day", "price_normal": 11500},
            {"capacidad": 14, "period": "weekend", "price_normal": 12500},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 13500},

            {"capacidad": 20, "period": "same_day", "price_normal": 13000},
            {"capacidad": 20, "period": "weekend", "price_normal": 14000},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 14500},
        ]
    },

    # ================================
    # GUANAJUATO
    # ================================
    {
        "name": "Guanajuato",
        "slug": "guanajuato",
        "prices": [
            {"capacidad": 6, "period": "same_day", "price_normal": 8500},
            {"capacidad": 6, "period": "weekend", "price_normal": 9500},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 10500},

            {"capacidad": 14, "period": "same_day", "price_normal": 11500},
            {"capacidad": 14, "period": "weekend", "price_normal": 12500},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 13500},

            {"capacidad": 20, "period": "same_day", "price_normal": 13000},
            {"capacidad": 20, "period": "weekend", "price_normal": 14000},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 15000},
        ]
    },

    # ================================
    # MORELIA
    # ================================
    {
        "name": "Morelia",
        "slug": "morelia",
        "prices": [
            {"capacidad": 6, "period": "same_day", "price_normal": 8500},
            {"capacidad": 6, "period": "weekend", "price_normal": 9500},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 10500},

            {"capacidad": 14, "period": "same_day", "price_normal": 11500},
            {"capacidad": 14, "period": "weekend", "price_normal": 12500},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 13500},

            {"capacidad": 20, "period": "same_day", "price_normal": 13000},
            {"capacidad": 20, "period": "weekend", "price_normal": 14000},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 15000},
        ]
    },

    # ================================
    # TEPIC
    # ================================
    {
        "name": "Tepic",
        "slug": "tepic",
        "prices": [
            {"capacidad": 6, "period": "same_day", "price_normal": 8000},
            {"capacidad": 6, "period": "weekend", "price_normal": 9000},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 10000},

            {"capacidad": 14, "period": "same_day", "price_normal": 10500},
            {"capacidad": 14, "period": "weekend", "price_normal": 11500},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 12500},

            {"capacidad": 20, "period": "same_day", "price_normal": 12000},
            {"capacidad": 20, "period": "weekend", "price_normal": 13000},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 14000},
        ]
    },

    # ================================
    # TAPALPA
    # ================================
    {
        "name": "Tapalpa",
        "slug": "tapalpa",
        "prices": [
            {"capacidad": 6, "period": "same_day", "price_normal": 5000},
            {"capacidad": 6, "period": "weekend", "price_normal": 6500},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 7500},

            {"capacidad": 14, "period": "same_day", "price_normal": 7500},
            {"capacidad": 14, "period": "weekend", "price_normal": 8500},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 9500},

            {"capacidad": 20, "period": "same_day", "price_normal": 9000},
            {"capacidad": 20, "period": "weekend", "price_normal": 10000},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 11000},
        ]
    },

    # ================================
    # MAZAMITLA
    # ================================
    {
        "name": "Mazamita",
        "slug": "mazamitla",
        "prices": [
            {"capacidad": 6, "period": "same_day", "price_normal": 5000},
            {"capacidad": 6, "period": "weekend", "price_normal": 6500},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 7500},

            {"capacidad": 14, "period": "same_day", "price_normal": 7500},
            {"capacidad": 14, "period": "weekend", "price_normal": 8500},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 9500},

            {"capacidad": 20, "period": "same_day", "price_normal": 9000},
            {"capacidad": 20, "period": "weekend", "price_normal": 10000},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 11000},
        ]
    },

    # ================================
    # CHAPALA
    # ================================
    {
        "name": "Chapala",
        "slug": "chapala",
        "prices": [
            {"capacidad": 6, "period": "same_day", "price_normal": 3000},
            {"capacidad": 6, "period": "weekend", "price_normal": 3500},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 4000},

            {"capacidad": 14, "period": "same_day", "price_normal": 5500},
            {"capacidad": 14, "period": "weekend", "price_normal": 6000},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 6500},

            {"capacidad": 20, "period": "same_day", "price_normal": 6500},
            {"capacidad": 20, "period": "weekend", "price_normal": 7000},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 7500},
        ]
    },

    # ================================
    # TEQUILA
    # ================================
    {
        "name": "Tequila",
        "slug": "tequila",
        "prices": [
            {"capacidad": 6, "period": "same_day", "price_normal": 3000},
            {"capacidad": 6, "period": "weekend", "price_normal": 3500},
            {"capacidad": 6, "period": "long_weekend", "price_normal": 4000},

            {"capacidad": 14, "period": "same_day", "price_normal": 5500},
            {"capacidad": 14, "period": "weekend", "price_normal": 6000},
            {"capacidad": 14, "period": "long_weekend", "price_normal": 6500},

            {"capacidad": 20, "period": "same_day", "price_normal": 6500},
            {"capacidad": 20, "period": "weekend", "price_normal": 7000},
            {"capacidad": 20, "period": "long_weekend", "price_normal": 7500},
        ]
    },
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