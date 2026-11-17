"""Conservar productos retirados y su historial de consumo."""
from alembic import op
import sqlalchemy as sa

revision = "f6b7a4d102c9"
down_revision = "e8f12a39c504"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("inventory", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("inventory", "archived_at")
