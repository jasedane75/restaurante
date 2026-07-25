from fastapi import APIRouter, Depends
from app.auth import require_roles
from app.db import get_supabase

router = APIRouter(prefix="/ventas", tags=["ventas"])


@router.get("/")
def listar_ventas(
    fecha_desde: str = None,
    fecha_hasta: str = None,
    user=Depends(require_roles("dueno", "cajero")),
):
    q = get_supabase().table("ventas").select("*, pedidos(tipo, mesa_id)").order("creado_en", desc=True)
    if fecha_desde:
        q = q.gte("creado_en", fecha_desde)
    if fecha_hasta:
        q = q.lte("creado_en", fecha_hasta)
    return q.execute().data


@router.get("/resumen-diario")
def resumen_diario(user=Depends(require_roles("dueno", "cajero"))):
    return (
        get_supabase()
        .table("vw_ventas_diarias")
        .select("*")
        .limit(30)
        .execute()
        .data
    )


@router.get("/productos-top")
def productos_top(user=Depends(require_roles("dueno", "cajero"))):
    return (
        get_supabase()
        .table("vw_productos_top")
        .select("*")
        .limit(20)
        .execute()
        .data
    )


@router.get("/detalle")
def ventas_detalle(
    fecha_desde: str = None,
    fecha_hasta: str = None,
    user=Depends(require_roles("dueno", "cajero")),
):
    """Endpoint principal para Power BI."""
    q = get_supabase().table("vw_ventas_detalle").select("*")
    if fecha_desde:
        q = q.gte("fecha_venta", fecha_desde)
    if fecha_hasta:
        q = q.lte("fecha_venta", fecha_hasta)
    return q.execute().data
