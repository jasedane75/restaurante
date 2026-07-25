from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.routers import auth, mesas, productos, pedidos, inventario, ventas

app = FastAPI(title="Restaurante API", version="1.0.0")

import os

ORIGINS = [
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),   # ej: https://restaurante.vercel.app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ORIGINS if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(mesas.router)
app.include_router(productos.router)
app.include_router(pedidos.router)
app.include_router(inventario.router)
app.include_router(ventas.router)


@app.get("/")
def health():
    return {"status": "ok", "app": "Restaurante API"}
