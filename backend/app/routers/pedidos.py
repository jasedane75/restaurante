from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import PedidoIn, PedidoOut, PedidoEstadoIn, CerrarPedidoIn, VentaOut, DetallePedidoIn
from app.auth import get_current_user, require_roles
from app.db import get_supabase
from datetime import datetime, timezone

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


def _enriquecer_pedido(pedido: dict) -> dict:
    items = (
        get_supabase()
        .table("detalle_pedidos")
        .select("*")
        .eq("pedido_id", pedido["id"])
        .execute()
        .data
    )
    pedido["items"] = items
    return pedido


@router.get("/", response_model=list[PedidoOut])
def listar_pedidos(estado: str = None, user=Depends(get_current_user)):
    q = get_supabase().table("pedidos").select("*").order("creado_en", desc=True)
    if estado == "activos":
        q = q.in_("estado", ["abierto", "en_cocina", "listo"])
    elif estado:
        q = q.eq("estado", estado)
    pedidos = q.execute().data
    return [_enriquecer_pedido(p) for p in pedidos]


@router.get("/{pedido_id}", response_model=PedidoOut)
def ver_pedido(pedido_id: int, user=Depends(get_current_user)):
    res = get_supabase().table("pedidos").select("*").eq("id", pedido_id).execute()
    if not res.data:
        raise HTTPException(404, "Pedido no encontrado")
    return _enriquecer_pedido(res.data[0])


@router.post("/", response_model=PedidoOut)
def crear_pedido(data: PedidoIn, user=Depends(require_roles("dueno", "cajero", "mesero"))):
    sb = get_supabase()

    # Validar mesa disponible si es pedido de mesa
    if data.tipo == "mesa":
        if not data.mesa_id:
            raise HTTPException(400, "Se requiere mesa_id para pedido de mesa")
        mesa = sb.table("mesas").select("estado").eq("id", data.mesa_id).execute().data
        if not mesa or mesa[0]["estado"] not in ("disponible", "reservada"):
            raise HTTPException(400, "Mesa no disponible")

    # Obtener precios actuales de los productos
    ids = [i.producto_id for i in data.items]
    productos = {
        p["id"]: p
        for p in sb.table("productos").select("id,precio,disponible").in_("id", ids).execute().data
    }

    for item in data.items:
        if item.producto_id not in productos:
            raise HTTPException(400, f"Producto {item.producto_id} no existe")
        if not productos[item.producto_id]["disponible"]:
            raise HTTPException(400, f"Producto {item.producto_id} no disponible")

    # Crear pedido
    pedido_payload = {
        "tipo": data.tipo,
        "mesa_id": data.mesa_id,
        "usuario_id": user["sub"],
        "comensales": data.comensales,
        "cliente_nombre": data.cliente_nombre,
        "cliente_telefono": data.cliente_telefono,
        "direccion_entrega": data.direccion_entrega,
        "notas": data.notas,
    }
    pedido = sb.table("pedidos").insert(pedido_payload).execute().data[0]

    # Insertar detalle
    detalle = [
        {
            "pedido_id": pedido["id"],
            "producto_id": item.producto_id,
            "cantidad": item.cantidad,
            "precio_unitario": float(productos[item.producto_id]["precio"]),
            "notas": item.notas,
        }
        for item in data.items
    ]
    sb.table("detalle_pedidos").insert(detalle).execute()

    # Marcar mesa como ocupada
    if data.tipo == "mesa" and data.mesa_id:
        sb.table("mesas").update({"estado": "ocupada"}).eq("id", data.mesa_id).execute()

    return _enriquecer_pedido(
        sb.table("pedidos").select("*").eq("id", pedido["id"]).execute().data[0]
    )


@router.post("/{pedido_id}/items", response_model=PedidoOut)
def agregar_items(
    pedido_id: int,
    items: list[DetallePedidoIn],
    user=Depends(require_roles("dueno", "cajero", "mesero")),
):
    """Agregar productos a un pedido existente (que no esté cerrado/cancelado)."""
    sb = get_supabase()

    pedido = sb.table("pedidos").select("*").eq("id", pedido_id).execute().data
    if not pedido:
        raise HTTPException(404, "Pedido no encontrado")
    pedido = pedido[0]

    if pedido["estado"] in ("cerrado", "cancelado"):
        raise HTTPException(400, "No se puede modificar un pedido cerrado o cancelado")

    # Obtener precios
    ids = [i.producto_id for i in items]
    productos = {
        p["id"]: p
        for p in sb.table("productos").select("id,precio,disponible").in_("id", ids).execute().data
    }

    for item in items:
        if item.producto_id not in productos:
            raise HTTPException(400, f"Producto {item.producto_id} no existe")

    detalle = [
        {
            "pedido_id": pedido_id,
            "producto_id": item.producto_id,
            "cantidad": item.cantidad,
            "precio_unitario": float(productos[item.producto_id]["precio"]),
            "notas": item.notas,
        }
        for item in items
    ]
    sb.table("detalle_pedidos").insert(detalle).execute()

    return _enriquecer_pedido(
        sb.table("pedidos").select("*").eq("id", pedido_id).execute().data[0]
    )


@router.delete("/{pedido_id}/items/{item_id}", response_model=PedidoOut)
def eliminar_item(
    pedido_id: int,
    item_id: int,
    user=Depends(require_roles("dueno", "cajero", "mesero")),
):
    """Eliminar un item de un pedido existente."""
    sb = get_supabase()

    pedido = sb.table("pedidos").select("*").eq("id", pedido_id).execute().data
    if not pedido:
        raise HTTPException(404, "Pedido no encontrado")
    if pedido[0]["estado"] in ("cerrado", "cancelado"):
        raise HTTPException(400, "No se puede modificar un pedido cerrado o cancelado")

    sb.table("detalle_pedidos").delete().eq("id", item_id).eq("pedido_id", pedido_id).execute()

    return _enriquecer_pedido(
        sb.table("pedidos").select("*").eq("id", pedido_id).execute().data[0]
    )


@router.delete("/{pedido_id}", response_model=dict)
def cancelar_pedido(
    pedido_id: int,
    user=Depends(require_roles("dueno", "cajero", "mesero")),
):
    """Cancelar pedido y liberar la mesa."""
    sb = get_supabase()

    pedido = sb.table("pedidos").select("*").eq("id", pedido_id).execute().data
    if not pedido:
        raise HTTPException(404, "Pedido no encontrado")
    pedido = pedido[0]

    if pedido["estado"] == "cerrado":
        raise HTTPException(400, "No se puede cancelar un pedido ya cerrado")

    # Marcar como cancelado
    sb.table("pedidos").update({
        "estado": "cancelado",
    }).eq("id", pedido_id).execute()

    # Liberar mesa
    if pedido.get("mesa_id"):
        sb.table("mesas").update({"estado": "disponible"}).eq("id", pedido["mesa_id"]).execute()

    return {"message": "Pedido cancelado y mesa liberada"}


@router.patch("/{pedido_id}/estado", response_model=PedidoOut)
def cambiar_estado(
    pedido_id: int,
    data: PedidoEstadoIn,
    user=Depends(require_roles("dueno", "cajero", "mesero")),
):
    sb = get_supabase()
    pedido = sb.table("pedidos").select("*").eq("id", pedido_id).execute().data
    if not pedido:
        raise HTTPException(404, "Pedido no encontrado")

    update = {"estado": data.estado}
    if data.estado == "cerrado":
        update["cerrado_en"] = datetime.now(timezone.utc).isoformat()

    res = sb.table("pedidos").update(update).eq("id", pedido_id).execute()
    return _enriquecer_pedido(res.data[0])


@router.post("/{pedido_id}/cerrar", response_model=VentaOut)
def cerrar_pedido(
    pedido_id: int,
    data: CerrarPedidoIn,
    user=Depends(require_roles("dueno", "cajero")),
):
    sb = get_supabase()

    pedido = sb.table("pedidos").select("*").eq("id", pedido_id).execute().data
    if not pedido:
        raise HTTPException(404, "Pedido no encontrado")
    pedido = pedido[0]

    if pedido["estado"] == "cerrado":
        raise HTTPException(400, "El pedido ya está cerrado")

    total = float(pedido["subtotal"]) - data.descuento

    # Actualizar pedido
    sb.table("pedidos").update({
        "estado": "cerrado",
        "descuento": data.descuento,
        "cerrado_en": datetime.now(timezone.utc).isoformat(),
    }).eq("id", pedido_id).execute()

    # Crear venta
    venta = sb.table("ventas").insert({
        "pedido_id": pedido_id,
        "cajero_id": user["sub"],
        "metodo_pago": data.metodo_pago,
        "estado_pago": "pagado",
        "total": total,
    }).execute().data[0]

    # Descontar inventario via función SQL
    sb.rpc("descontar_inventario_pedido", {
        "p_pedido_id": pedido_id,
        "p_usuario_id": user["sub"],
    }).execute()

    # Liberar mesa
    if pedido.get("mesa_id"):
        sb.table("mesas").update({"estado": "disponible"}).eq("id", pedido["mesa_id"]).execute()

    return venta
