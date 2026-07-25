from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import InsumoIn, InsumoOut, AjusteStockIn
from app.auth import require_roles
from app.db import get_supabase

router = APIRouter(prefix="/inventario", tags=["inventario"])


@router.get("/", response_model=list[InsumoOut])
def listar_insumos(user=Depends(require_roles("dueno", "cajero"))):
    return get_supabase().table("insumos").select("*").order("nombre").execute().data


@router.get("/alertas")
def alertas_stock(user=Depends(require_roles("dueno", "cajero"))):
    """Insumos con stock bajo o sin stock."""
    return (
        get_supabase()
        .table("vw_inventario_estado")
        .select("*")
        .neq("alerta", "ok")
        .execute()
        .data
    )


@router.post("/", response_model=InsumoOut)
def crear_insumo(data: InsumoIn, user=Depends(require_roles("dueno"))):
    res = get_supabase().table("insumos").insert(data.model_dump()).execute()
    return res.data[0]


@router.put("/{insumo_id}", response_model=InsumoOut)
def actualizar_insumo(
    insumo_id: int, data: InsumoIn, user=Depends(require_roles("dueno"))
):
    res = (
        get_supabase()
        .table("insumos")
        .update(data.model_dump())
        .eq("id", insumo_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Insumo no encontrado")
    return res.data[0]


@router.post("/{insumo_id}/ajuste", response_model=InsumoOut)
def ajustar_stock(
    insumo_id: int,
    data: AjusteStockIn,
    user=Depends(require_roles("dueno", "cajero")),
):
    sb = get_supabase()
    insumo = sb.table("insumos").select("*").eq("id", insumo_id).execute().data
    if not insumo:
        raise HTTPException(404, "Insumo no encontrado")
    insumo = insumo[0]

    stock_ant = float(insumo["stock_actual"])
    stock_nvo = stock_ant + data.cantidad if data.tipo == "entrada" else data.cantidad

    sb.table("insumos").update({"stock_actual": stock_nvo}).eq("id", insumo_id).execute()
    sb.table("inventario_movimientos").insert({
        "insumo_id": insumo_id,
        "tipo": data.tipo,
        "cantidad": data.cantidad,
        "stock_anterior": stock_ant,
        "stock_nuevo": stock_nvo,
        "referencia": data.referencia,
        "usuario_id": user["sub"],
    }).execute()

    return sb.table("insumos").select("*").eq("id", insumo_id).execute().data[0]


@router.get("/movimientos")
def ver_movimientos(
    insumo_id: int = None,
    user=Depends(require_roles("dueno", "cajero")),
):
    q = get_supabase().table("vw_inventario_movimientos").select("*")
    if insumo_id:
        q = q.eq("insumo_id", insumo_id)
    return q.limit(200).execute().data
