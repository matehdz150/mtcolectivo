import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Toma DATABASE_URL de entorno o usa SQLite local
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Si viene como postgresql:// lo convertimos para SQLAlchemy
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg2://",
        1
    )

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "sslmode": "require"
    } if DATABASE_URL.startswith("postgresql") else {
        "check_same_thread": False
    },
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass