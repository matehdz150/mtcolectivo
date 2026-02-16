from sqlalchemy import asc
from app.models import Service, ServicePrice

class PricingEngine:

    def __init__(self, db):
        self.db = db

    def calculate(self, service_slug: str, pasajeros: int, hora: str):

        service = (
            self.db.query(Service)
            .filter(Service.slug == service_slug, Service.active == True)
            .first()
        )

        if not service:
            return 0.0, None

        period = self._determine_period(hora)

        # 🔥 1️⃣ Obtener todas las capacidades disponibles
        capacidades = (
            self.db.query(ServicePrice.capacidad)
            .filter(ServicePrice.service_id == service.id)
            .distinct()
            .order_by(asc(ServicePrice.capacidad))
            .all()
        )

        if not capacidades:
            return 0.0, None

        capacidades = [c[0] for c in capacidades]

        # 🔥 2️⃣ Buscar la mínima capacidad que cubra pasajeros
        capacidad_asignada = None

        for cap in capacidades:
            if pasajeros <= cap:
                capacidad_asignada = cap
                break

        # 🔥 3️⃣ Si ninguna alcanza → usar la mayor disponible
        if not capacidad_asignada:
            capacidad_asignada = max(capacidades)

        # 🔥 4️⃣ Buscar precio con esa capacidad
        price = (
            self.db.query(ServicePrice)
            .filter(
                ServicePrice.service_id == service.id,
                ServicePrice.capacidad == capacidad_asignada,
                ServicePrice.period == period
            )
            .first()
        )

        # fallback full_day
        if not price:
            price = (
                self.db.query(ServicePrice)
                .filter(
                    ServicePrice.service_id == service.id,
                    ServicePrice.capacidad == capacidad_asignada,
                    ServicePrice.period == "full_day"
                )
                .first()
            )

        if not price:
            return 0.0, capacidad_asignada

        return float(price.price_normal or 0), capacidad_asignada