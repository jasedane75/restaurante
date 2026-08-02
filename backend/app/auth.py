from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from functools import lru_cache
from app.db import get_settings

bearer = HTTPBearer()


@lru_cache
def _get_jwks() -> dict:
    """Obtener las claves públicas JWKS de Supabase para verificar tokens ES256."""
    url = f"{get_settings().supabase_url}/auth/v1/.well-known/jwks.json"
    response = httpx.get(url)
    response.raise_for_status()
    return response.json()


def _get_signing_key(token: str):
    """Extraer la clave pública correcta del JWKS basada en el kid del token."""
    from jose import jwk
    from jose.utils import base64url_decode
    import json

    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")

    jwks = _get_jwks()
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials
    try:
        # Intentar verificar con JWKS (ES256 - nuevo formato Supabase)
        headers = jwt.get_unverified_header(token)
        if headers.get("alg") == "ES256":
            signing_key = _get_signing_key(token)
            if signing_key:
                payload = jwt.decode(
                    token,
                    signing_key,
                    algorithms=["ES256"],
                    options={"verify_aud": False},
                )
                return payload

        # Fallback: verificar con JWT secret (HS256 - formato legacy)
        payload = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")


def require_roles(*roles: str):
    def dependency(user: dict = Depends(get_current_user)) -> dict:
        rol = user.get("user_metadata", {}).get("rol")
        if rol not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
        return user
    return dependency
