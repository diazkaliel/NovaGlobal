from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.settings import settings
from app.routers import auth, clients, repairs, inventory, screen_prices, public, comments, sales, cash_register, machines, brand_kits, qa_inspections, chats, quotations

app = FastAPI(
    title="Nova - Sistema de Gestión Técnica",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.on_event("startup")
async def on_startup():
    try:
        from app.db.database import engine, Base
        import app.models  # noqa: F401
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"[STARTUP WARN] Error al autocrear tablas: {e}")

cors_regex = r"https?://.*"

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
    ] + [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_origin_regex=cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def cors_handler_middleware(request, call_next):
    origin = request.headers.get("origin")
    
    if request.method == "OPTIONS":
        from fastapi.responses import Response
        req_headers = request.headers.get("access-control-request-headers", "Authorization, Content-Type, Accept, Origin, X-Requested-With")
        res_origin = origin if origin else "*"
        response = Response(status_code=200)
        response.headers["Access-Control-Allow-Origin"] = res_origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = req_headers
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

    response = await call_next(request)
    if origin:
        req_headers = request.headers.get("access-control-request-headers", "Authorization, Content-Type, Accept, Origin, X-Requested-With")
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = req_headers
    return response


from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"[ERROR] Unhandled exception: {exc}")
    traceback.print_exc()
    origin = request.headers.get("origin", "*")
    req_headers = request.headers.get("access-control-request-headers", "Authorization, Content-Type, Accept, Origin, X-Requested-With")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal Server Error"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": req_headers,
        }
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
app.include_router(quotations.router)

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