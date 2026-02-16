from sqlalchemy import asc
from app.models import Service, ServicePrice


class PricingEngine:
    def __init__(self, db):
        self.db = db

    # 🔥 Determinar periodo según duración en días
    def _determine_period(self, duracion_horas: float) -> str:
        if duracion_horas <= 24:
            return "same_day"
        elif duracion_horas <= 48:
            return "weekend"
        else:
            return "long_weekend"

    def calculate(self, service_slug: str, pasajeros: int, duracion_horas: float):

        try:
            pasajeros = int(pasajeros)
        except:
            pasajeros = 0

        service = (
            self.db.query(Service)
            .filter(Service.slug == service_slug, Service.active == True)
            .first()
        )

        if not service:
            return 0.0, None

        period = self._determine_period(duracion_horas)

        # 🔥 Obtener capacidades disponibles
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

        # 🔥 Asignar capacidad mínima suficiente
        capacidad_asignada = None
        for cap in capacidades:
            if pasajeros <= cap:
                capacidad_asignada = cap
                break

        if capacidad_asignada is None:
            capacidad_asignada = max(capacidades)

        # 🔥 Buscar precio exacto
        price = (
            self.db.query(ServicePrice)
            .filter(
                ServicePrice.service_id == service.id,
                ServicePrice.capacidad == capacidad_asignada,
                ServicePrice.period == period
            )
            .first()
        )

        # 🔥 Fallbacks fuertes
        if not price:
            price = (
                self.db.query(ServicePrice)
                .filter(
                    ServicePrice.service_id == service.id,
                    ServicePrice.capacidad == capacidad_asignada
                )
                .order_by(ServicePrice.id.asc())
                .first()
            )

        if not price:
            return 0.0, capacidad_asignada

        return float(price.price_normal or 0.0), capacidad_asignada