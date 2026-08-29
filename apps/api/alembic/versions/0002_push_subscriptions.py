"""web push subscriptions for admin PWA

Revision ID: 0002_push
Revises: 0001_initial
Create Date: 2026-08-27
"""

from alembic import op
from sqlalchemy import text

revision = "0002_push"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                endpoint VARCHAR(2048) NOT NULL,
                p256dh VARCHAR(255) NOT NULL,
                auth VARCHAR(255) NOT NULL,
                user_agent VARCHAR(400),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
            )
            """
        )
    )
    op.execute(text("CREATE INDEX IF NOT EXISTS ix_push_subscriptions_user_id ON push_subscriptions (user_id)"))


def downgrade() -> None:
    op.execute(text("DROP TABLE IF EXISTS push_subscriptions"))
