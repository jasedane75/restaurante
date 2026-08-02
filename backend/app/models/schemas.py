from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


# ── Auth ──────────────────────────────────────────────────────
class LoginIn(BaseModel):
    email: str
    password: str


# ── Categorías ────────────────────────────────────────────────
class CategoriaOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None


# ── Productos ─────────────────────────────────────────────────
class ProductoIn(BaseModel):
    categoria_id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    precio: float = Field(gt=0)
    disponible: bool = True
    imagen_url: Optional[str] = None


class ProductoOut(ProductoIn):
    id: int
    creado_en: datetime


# ── Insumos ───────────────────────────────────────────────────
class InsumoIn(BaseModel):
    nombre: str
    unidad: Literal["unidad", "kg", "g", "litro", "ml", "porcion"] = "unidad"
    stock_actual: float = 0
    stock_minimo: float = 0
    contabilizar: bool = True


class InsumoOut(InsumoIn):
    id: int
    creado_en: datetime


class AjusteStockIn(BaseModel):
    cantidad: float
    tipo: Literal["entrada", "ajuste"]
    referencia: Optional[str] = None


# ── Recetas ───────────────────────────────────────────────────
class RecetaIn(BaseModel):
    insumo_id: int
    cantidad: float = Field(gt=0)


class RecetaOut(RecetaIn):
    id: int
    producto_id: int


# ── Mesas ─────────────────────────────────────────────────────
class MesaOut(BaseModel):
    id: int
    numero: int
    capacidad: int
    estado: str


class MesaEstadoIn(BaseModel):
    estado: Literal["disponible", "ocupada", "reservada", "cuenta_pedida"]


# ── Pedidos ───────────────────────────────────────────────────
class DetallePedidoIn(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)
    notas: Optional[str] = None


class PedidoIn(BaseModel):
    tipo: Literal["mesa", "delivery"] = "mesa"
    mesa_id: Optional[int] = None
    comensales: Optional[int] = None
    cliente_nombre: Optional[str] = None
    cliente_telefono: Optional[str] = None
    direccion_entrega: Optional[str] = None
    notas: Optional[str] = None
    items: list[DetallePedidoIn]


class PedidoEstadoIn(BaseModel):
    estado: Literal["abierto", "en_cocina", "listo", "cerrado", "cancelado"]


class DetallePedidoOut(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unitario: float
    subtotal: float
    notas: Optional[str] = None


class PedidoOut(BaseModel):
    id: int
    tipo: str
    mesa_id: Optional[int]
    comensales: Optional[int] = None
    estado: str
    subtotal: float
    descuento: float
    total: float
    notas: Optional[str]
    creado_en: datetime
    cerrado_en: Optional[datetime]
    items: list[DetallePedidoOut] = []


# ── Ventas ────────────────────────────────────────────────────
class CerrarPedidoIn(BaseModel):
    metodo_pago: Literal["efectivo", "tarjeta", "transferencia", "otro"] = "efectivo"
    descuento: float = 0


class VentaOut(BaseModel):
    id: int
    pedido_id: int
    metodo_pago: str
    estado_pago: str
    total: float
    creado_en: datetime
