from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://doors:doors@localhost:5432/doors"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost,http://localhost:3000"
    admin_email: str = "admin@localhost"
    admin_password: str = "changeme"
    site_url: str = "http://localhost"
    site_name: str = "Качественные двери"
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    email_user: str = ""
    email_pass: str = ""
    admin_phone: str = "79503101560"
    upload_dir: str = "uploads"

    @property
    def cors_origin_list(self) -> list[str]:
        items = [item.strip().rstrip("/") for item in self.cors_origins.split(",") if item.strip()]
        site = self.site_url.strip().rstrip("/")
        if site and site not in items:
            items.append(site)
        return items


@lru_cache
def get_settings() -> Settings:
    return Settings()
