from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.settings import settings
from app.routers import auth, clients, repairs, inventory, screen_prices, public, comments, sales, cash_register, machines, brand_kits, qa_inspections, chats

app = FastAPI(
    title="Nova - Sistema de Gestión Técnica",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "https://novalogtecnologies.com",
        "http://novalogtecnologies.com",
    ] + [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registramos los routers

app.include_router(auth.router)
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

# Servir archivos estaticos cargados
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/", tags=["health"])
async def root():
    return {
        "project": "Nova",
        "status": "online",
        "environment": settings.ENVIRONMENT
    }