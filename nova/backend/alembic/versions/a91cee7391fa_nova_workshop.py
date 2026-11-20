"""Seguimiento de equipos, retiros y presupuestos de Nova."""
from alembic import op
import sqlalchemy as sa

revision = "a91cee7391fa"
down_revision = "ce62d881f205"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    names = {c["name"] for c in inspector.get_columns("repairs")}
    for column in (
        sa.Column("device_identifier", sa.String(100)),
        sa.Column("warranty_origin_id", sa.Integer(), sa.ForeignKey("repairs.id", ondelete="SET NULL")),
        sa.Column("pickup_notified_at", sa.DateTime(timezone=True)),
    ):
        if column.name not in names:
            op.add_column("repairs", column)
    if not inspector.has_table("nova_estimates"):
        op.create_table("nova_estimates",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("repair_id", sa.Integer(), sa.ForeignKey("repairs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token", sa.String(64), nullable=False, unique=True),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("decision", sa.String(16), nullable=False),
            sa.Column("decided_at", sa.DateTime(timezone=True)),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
        op.create_index("ix_nova_estimates_repair_id", "nova_estimates", ["repair_id"])


def downgrade():
    op.drop_table("nova_estimates")
    for name in ("pickup_notified_at", "warranty_origin_id", "device_identifier"):
        op.drop_column("repairs", name)
