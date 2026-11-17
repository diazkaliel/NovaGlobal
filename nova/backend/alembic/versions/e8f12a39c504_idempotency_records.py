"""Resultados persistentes para reintentos de órdenes y consumos."""
from alembic import op
import sqlalchemy as sa

revision = "e8f12a39c504"
down_revision = "d7ce92c1a470"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "idempotency_records",
        sa.Column("user_id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(36), primary_key=True),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("response", sa.JSON(), nullable=True),
    )


def downgrade():
    op.drop_table("idempotency_records")
