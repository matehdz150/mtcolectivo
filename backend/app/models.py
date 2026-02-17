from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base  

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    service_id = Column(Integer, ForeignKey("services.id"))
    service = relationship("Service")

    # datos generales
    nombre = Column(String, nullable=True)
    fecha = Column(String, nullable=True)
    dir_salida = Column(String, nullable=True)
    dir_destino = Column(String, nullable=True)
    hor_ida = Column(String, nullable=True)
    hor_regreso = Column(String, nullable=True)

    duracion = Column(Float, nullable=True)
    capacidadu = Column(Integer, nullable=True)

    # montos
    subtotal = Column(Float, nullable=True)  
    descuento = Column(Float, nullable=True)
    total = Column(Float, nullable=True)
    abonado = Column(Float, nullable=True)
    fecha_abono = Column(String, nullable=True)
    liquidar = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    active = Column(Boolean, default=True)

    prices = relationship("ServicePrice", back_populates="service")


class ServicePrice(Base):
    __tablename__ = "service_prices"

    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("services.id"))
    service = relationship("Service", back_populates="prices")

    capacidad = Column(Integer)
    period = Column(String)  # morning / afternoon / full_day
    price_normal = Column(Float)
    price_discount = Column(Float)