"""partial undo of a price batch

Revision ID: 0003_history_undone
Revises: 0002_push
Create Date: 2026-08-29
"""

from alembic import op
from sqlalchemy import text

revision = "0003_history_undone"
down_revision = "0002_push"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(text("ALTER TABLE price_history ADD COLUMN IF NOT EXISTS undone_at TIMESTAMPTZ"))


def downgrade() -> None:
    op.execute(text("ALTER TABLE price_history DROP COLUMN IF EXISTS undone_at"))
