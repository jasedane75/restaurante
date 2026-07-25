from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import ProductoIn, ProductoOut, CategoriaOut, RecetaIn, RecetaOut
from app.auth import get_current_user, require_roles
from app.db import get_supabase

router = APIRouter(prefix="/productos", tags=["productos"])


@router.get("/categorias", response_model=list[CategoriaOut])
def listar_categorias(user=Depends(get_current_user)):
    res = get_supabase().table("categorias").select("*").order("nombre").execute()
    return res.data


@router.get("/", response_model=list[ProductoOut])
def listar_productos(disponible: bool = None, user=Depends(get_current_user)):
    q = get_supabase().table("productos").select("*")
    if disponible is not None:
        q = q.eq("disponible", disponible)
    return q.order("nombre").execute().data


@router.post("/", response_model=ProductoOut)
def crear_producto(data: ProductoIn, user=Depends(require_roles("dueno"))):
    res = get_supabase().table("productos").insert(data.model_dump()).execute()
    return res.data[0]


@router.put("/{producto_id}", response_model=ProductoOut)
def actualizar_producto(
    producto_id: int, data: ProductoIn, user=Depends(require_roles("dueno"))
):
    res = (
        get_supabase()
        .table("productos")
        .update(data.model_dump())
        .eq("id", producto_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Producto no encontrado")
    return res.data[0]


# ── Recetas ───────────────────────────────────────────────────
@router.get("/{producto_id}/receta", response_model=list[RecetaOut])
def ver_receta(producto_id: int, user=Depends(require_roles("dueno", "cajero"))):
    res = (
        get_supabase()
        .table("recetas")
        .select("*")
        .eq("producto_id", producto_id)
        .execute()
    )
    return res.data


@router.post("/{producto_id}/receta", response_model=RecetaOut)
def agregar_receta(
    producto_id: int, data: RecetaIn, user=Depends(require_roles("dueno"))
):
    payload = {"producto_id": producto_id, **data.model_dump()}
    res = get_supabase().table("recetas").upsert(payload).execute()
    return res.data[0]


@router.delete("/{producto_id}/receta/{insumo_id}", status_code=204)
def eliminar_receta(
    producto_id: int, insumo_id: int, user=Depends(require_roles("dueno"))
):
    get_supabase().table("recetas").delete().eq("producto_id", producto_id).eq(
        "insumo_id", insumo_id
    ).execute()
