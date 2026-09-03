"""order delivery address from checkout / DaData

Revision ID: 0004_order_address
Revises: 0003_history_undone
Create Date: 2026-09-03
"""

from alembic import op
from sqlalchemy import text

revision = "0004_order_address"
down_revision = "0003_history_undone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address VARCHAR(300) NOT NULL DEFAULT ''")
    )


def downgrade() -> None:
    op.execute(text("ALTER TABLE orders DROP COLUMN IF EXISTS address"))
