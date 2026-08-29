from app.config import Settings


def test_production_rejects_weak_secrets():
    settings = Settings(
        app_env="production",
        secret_key="changeme",
        admin_password="secret-password-ok",
        database_url="postgresql+asyncpg://doors:strongpass@postgres:5432/doors",
        site_url="https://elite-doors.shop",
    )
    try:
        settings.validate_for_runtime()
        raise AssertionError("expected RuntimeError")
    except RuntimeError as exc:
        assert "SECRET_KEY" in str(exc)


def test_production_accepts_strong_secrets():
    settings = Settings(
        app_env="production",
        secret_key="a" * 32,
        admin_password="not-the-default",
        database_url="postgresql+asyncpg://doors:strongpass@postgres:5432/doors",
        site_url="https://elite-doors.shop",
    )
    settings.validate_for_runtime()


def test_development_allows_defaults():
    Settings(app_env="development").validate_for_runtime()


def test_telegram_flag():
    empty = Settings()
    assert empty.telegram_configured is False
    ready = Settings(telegram_bot_token="tok", telegram_chat_id="1")
    assert ready.telegram_configured is True


def test_vapid_flag():
    empty = Settings()
    assert empty.vapid_configured is False
    ready = Settings(vapid_public_key="Bxxx", vapid_private_key="priv")
    assert ready.vapid_configured is True


def test_cors_includes_site_url():
    settings = Settings(cors_origins="http://localhost", site_url="https://elite-doors.shop")
    assert "https://elite-doors.shop" in settings.cors_origin_list


def test_is_production():
    assert Settings(app_env="production").is_production is True
    assert Settings(app_env="development").is_production is False
