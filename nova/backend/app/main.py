from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.settings import settings
from app.routers import (
    auth, clients, repairs, inventory, screen_prices, public,
    comments, sales, cash_register, machines, brand_kits,
    qa_inspections, chats, quotations, attendance, admin_users,
    activity_logs
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nova.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestor de ciclo de vida moderno de FastAPI (Lifespan).
    Verifica la conectividad con la base de datos y crea tablas / columnas si no existen.
    """
    try:
        from app.db.database import engine, Base
        from sqlalchemy import text
        import app.models  # noqa: F401
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS system VARCHAR(20) DEFAULT 'all' NOT NULL;"))
            await conn.execute(text("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS system VARCHAR(20) DEFAULT 'nova' NOT NULL;"))
            await conn.execute(text("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT;"))
            await conn.execute(text("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS system VARCHAR(20) DEFAULT 'nova' NOT NULL;"))
            await conn.execute(text("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;"))
            await conn.execute(text("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS mockup_file_url TEXT;"))
            await conn.execute(text("ALTER TABLE repairs ADD COLUMN IF NOT EXISTS design_file_url TEXT;"))
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS rut VARCHAR(20);"))
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS region VARCHAR(100);"))
        logger.info("Base de datos y columnas sincronizadas correctamente.")
    except Exception as e:
        logger.warning(f"Advertencia al inicializar esquema de base de datos: {e}")

    yield

    logger.info("Servidor apagándose limpiamente.")


app = FastAPI(
    title="Nova - Sistema de Gestión Técnica",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Lista explícita de dominios autorizados para CORS
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "https://novalogtecnologies.com",
    "http://novalogtecnologies.com",
    "https://personalizacionesbravo.com",
    "http://personalizacionesbravo.com",
    "https://admin.personalizacionesbravo.com",
    "http://admin.personalizacionesbravo.com",
    "https://admin-bravo.personalizacionesbravo.com",
    "http://admin-bravo.personalizacionesbravo.com",
    "https://api.personalizacionesbravo.com",
    "http://api.personalizacionesbravo.com",
    "https://admin.novalogtecnologies.com",
    "http://admin.novalogtecnologies.com",
    "https://admin-nova.novalogtecnologies.com",
    "http://admin-nova.novalogtecnologies.com",
    "https://api.novalogtecnologies.com",
    "http://api.novalogtecnologies.com",
]

env_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
allowed_origins = list(dict.fromkeys(default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|([a-zA-Z0-9-]+\.)?novalogtecnologies\.com|([a-zA-Z0-9-]+\.)?personalizacionesbravo\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Manejo centralizado de excepciones sin fuga de trazas internas en producción."""
    logger.error(f"Excepción no controlada en {request.url.path}: {exc}", exc_info=True)
    detail = str(exc) if settings.ENVIRONMENT == "development" else "Ocurrió un error interno en el servidor."
    headers = {}
    origin = request.headers.get("origin")
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
        headers=headers
    )


# Registro de Routers
app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(attendance.router)
app.include_router(activity_logs.router)
app.include_router(clients.router)
app.include_router(repairs.router)
app.include_router(inventory.router)
app.include_router(screen_prices.router)
app.include_router(public.router)
app.include_router(comments.router)
app.include_router(sales.router)
app.include_router(cash_register.router)
app.include_router(machines.router)
app.include_router(brand_kits.router)
app.include_router(qa_inspections.router)
app.include_router(chats.router)
app.include_router(quotations.router)

# Servir archivos estáticos de uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/", tags=["health"])
async def root():
    return {
        "project": "Nova",
        "status": "online",
        "environment": settings.ENVIRONMENT
    }