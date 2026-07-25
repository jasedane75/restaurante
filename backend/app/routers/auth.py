from fastapi import APIRouter, HTTPException
from app.models.schemas import LoginIn
from app.db import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(data: LoginIn):
    try:
        res = get_supabase().auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
        return {
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "usuario": {
                "id": res.user.id,
                "email": res.user.email,
                "rol": res.user.user_metadata.get("rol"),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")


@router.post("/logout")
def logout():
    get_supabase().auth.sign_out()
    return {"message": "Sesión cerrada"}
