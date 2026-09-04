from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

WEAK_SECRETS = {
    "change-me-to-a-long-random-string",
    "dev-secret-change-me",
    "changeme",
    "doors",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
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
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = ""
    email_user: str = ""
    email_pass: str = ""
    admin_phone: str = "79046726360"
    upload_dir: str = "uploads"
    sentry_dsn: str = ""
    dadata_api_key: str = ""
    dadata_secret: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        items = [item.strip().rstrip("/") for item in self.cors_origins.split(",") if item.strip()]
        site = self.site_url.strip().rstrip("/")
        if site and site not in items:
            items.append(site)
        return items

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def telegram_configured(self) -> bool:
        return bool(self.telegram_bot_token and self.telegram_chat_id)

    @property
    def vapid_configured(self) -> bool:
        return bool(self.vapid_public_key and self.vapid_private_key)

    @property
    def dadata_configured(self) -> bool:
        return bool(self.dadata_api_key)

    def validate_for_runtime(self) -> None:
        if not self.is_production:
            return
        if self.secret_key in WEAK_SECRETS or len(self.secret_key) < 32:
            raise RuntimeError("SECRET_KEY must be a long random string in production")
        if self.admin_password in WEAK_SECRETS:
            raise RuntimeError("ADMIN_PASSWORD must not be a default value in production")
        if "://doors:doors@" in self.database_url:
            raise RuntimeError("POSTGRES_PASSWORD must not stay 'doors' in production")
        if not self.site_url.startswith("https://"):
            raise RuntimeError("SITE_URL must be https://… in production")


@lru_cache
def get_settings() -> Settings:
    return Settings()
