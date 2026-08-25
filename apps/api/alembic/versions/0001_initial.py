"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-25
"""

from alembic import op
from sqlalchemy import text

from app.models import Base

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)
    op.execute(
        text(
            """
            CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
            BEGIN
              NEW.search_vector :=
                setweight(to_tsvector('russian', coalesce(NEW.name, '')), 'A') ||
                setweight(to_tsvector('russian', coalesce(NEW.description, '')), 'B') ||
                setweight(to_tsvector('russian', coalesce(NEW.manufacturer, '')), 'C');
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """
        )
    )
    op.execute(text("DROP TRIGGER IF EXISTS trg_products_search ON products"))
    op.execute(
        text(
            """
            CREATE TRIGGER trg_products_search
            BEFORE INSERT OR UPDATE OF name, description, manufacturer ON products
            FOR EACH ROW EXECUTE FUNCTION products_search_update();
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
