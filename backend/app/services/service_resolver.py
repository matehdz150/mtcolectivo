import unicodedata
from sqlalchemy.orm import Session
from app.models import Service


def normalize(text: str) -> str:
    if not text:
        return ""

    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return text


def resolve_service(destino: str, db: Session) -> Service:
    """
    Resolver universal sin depender de columnas extras.
    Nunca falla.
    """

    destino_norm = normalize(destino)

    services = db.query(Service).filter(Service.active == True).all()

    # 1️⃣ Match directo por slug
    for service in services:
        slug_norm = normalize(service.slug)
        if slug_norm in destino_norm:
            return service

    # 2️⃣ Match por nombre
    for service in services:
        name_norm = normalize(service.name)
        if name_norm in destino_norm:
            return service

    # 3️⃣ Fallback seguro: primer servicio activo
    if services:
        return services[0]

    return None