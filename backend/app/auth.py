from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.db import get_settings

bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials
    try:
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
