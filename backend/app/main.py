from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import pdf, orders, auth
from app.routers.orders import public_router, private_router
from app.routers.prices import price_router

app = FastAPI(
    title="MT Colectivo API",
    docs_url="/secret-docs",
    redoc_url=None,
    openapi_url="/secret-openapi.json"
)

# =======================
# STARTUP
# =======================

@app.on_event("startup")
def on_startup():
    # Crea las tablas si no existen (PostgreSQL)
    Base.metadata.create_all(bind=engine)

# =======================
# ROUTERS
# =======================

# 🔐 Login / Auth
app.include_router(auth.router)

# 📄 PDF — Requiere JWT
app.include_router(pdf.router)

# 🟢 PUBLICO: Google Forms puede entrar aquí
app.include_router(public_router)
app.include_router(price_router)


# 🔐 PRIVADO
app.include_router(private_router)
app.include_router(orders.private_router)

# =======================
# CORS
# =======================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mtcolectivo.vercel.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =======================
# HEALTH CHECK
# =======================

@app.get("/health")
def health():
    return {"status": "ok"}