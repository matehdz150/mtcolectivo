from sqlalchemy import asc
from app.models import Service, ServicePrice
from datetime import datetime
import re

class PricingEngine:
    def __init__(self, db):
        self.db = db

    # ✅ Parser tolerante (no truena)
    def _parse_hour(self, hora: str) -> int | None:
        if not hora:
            return None

        raw = str(hora).strip().lower()
        raw = raw.replace("a.m.", "am").replace("p.m.", "pm").replace(".", "").strip()

        # Si trae cosas raras tipo "17:33:00 am" -> ignora am/pm si la hora > 12
        nums = re.findall(r"\d+", raw)
        if not nums:
            return None

        try:
            h = int(nums[0])
        except:
            return None

        has_ampm = ("am" in raw) or ("pm" in raw)
        if has_ampm and h > 12:
            # ya es 24h
            return h

        # Intenta formatos comunes
        for fmt in ("%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p", "%I %p"):
            try:
                # normaliza "5pm" -> "5 pm"
                cleaned = raw.replace(" ", "")
                cleaned = re.sub(r"(am|pm)$", r" \1", cleaned).strip()
                dt = datetime.strptime(cleaned.upper(), fmt)
                return dt.hour
            except:
                pass

        # Último fallback: si vino "17" o "5"
        if 0 <= h <= 23:
            return h

        return None

    # ✅ Determina morning/afternoon/full_day sin fallar
    def _determine_period(self, hora: str) -> str:
        hour = self._parse_hour(hora)
        if hour is None:
            return "full_day"

        if 9 <= hour < 13:
            return "morning"
        if 13 <= hour < 20:
            return "afternoon"
        return "full_day"

    def calculate(self, service_slug: str, pasajeros: int, hora: str):
        # seguridad: pasajeros inválidos
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

        period = self._determine_period(hora)

        # 🔥 1️⃣ capacidades disponibles
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

        # 🔥 2️⃣ mínima capacidad que cubra pasajeros
        capacidad_asignada = None
        for cap in capacidades:
            if pasajeros <= cap:
                capacidad_asignada = cap
                break

        # 🔥 3️⃣ si excede todo -> mayor disponible
        if capacidad_asignada is None:
            capacidad_asignada = max(capacidades)

        # 🔥 4️⃣ buscar precio por period
        def q(period_value: str):
            return (
                self.db.query(ServicePrice)
                .filter(
                    ServicePrice.service_id == service.id,
                    ServicePrice.capacidad == capacidad_asignada,
                    ServicePrice.period == period_value,
                )
                .first()
            )

        price = q(period)

        # ✅ fallbacks fuertes (producción: nunca falla)
        if not price:
            price = q("full_day")
        if not price:
            price = q("morning")
        if not price:
            price = q("afternoon")

        # ✅ último fallback: cualquier precio de esa capacidad
        if not price:
            price = (
                self.db.query(ServicePrice)
                .filter(
                    ServicePrice.service_id == service.id,
                    ServicePrice.capacidad == capacidad_asignada,
                )
                .order_by(ServicePrice.id.asc())
                .first()
            )

        if not price:
            return 0.0, capacidad_asignada

        return float(price.price_normal or 0.0), capacidad_asignada