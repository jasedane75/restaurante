from fastapi import APIRouter, Depends
from app.models.schemas import MesaOut, MesaEstadoIn
from app.auth import get_current_user, require_roles
from app.db import get_supabase

router = APIRouter(prefix="/mesas", tags=["mesas"])


@router.get("/", response_model=list[MesaOut])
def listar_mesas(user=Depends(get_current_user)):
    res = get_supabase().table("mesas").select("*").order("numero").execute()
    return res.data


@router.patch("/{mesa_id}/estado", response_model=MesaOut)
def cambiar_estado(
    mesa_id: int,
    data: MesaEstadoIn,
    user=Depends(require_roles("dueno", "cajero", "mesero")),
):
    res = (
        get_supabase()
        .table("mesas")
        .update({"estado": data.estado})
        .eq("id", mesa_id)
        .execute()
    )
    return res.data[0]
