from pydantic_settings import BaseSettings
from supabase import create_client, Client
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    jwt_secret: str

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_supabase() -> Client:
    """Cliente con service_role — bypasa RLS porque la autorización la maneja FastAPI."""
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_key)


def get_supabase_admin() -> Client:
    """Alias para compatibilidad."""
    return get_supabase()
