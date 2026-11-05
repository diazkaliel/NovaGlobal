"""Persistir líneas de productos Bravo sin alterar las tablas Nova."""
from alembic import op
import sqlalchemy as sa

revision = "d7ce92c1a470"
down_revision = "b642fb70c521"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bravo_order_lines",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("repair_id", sa.Integer(), sa.ForeignKey("repairs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("catalog_product_id", sa.Integer(), sa.ForeignKey("inventory.id", ondelete="SET NULL"), nullable=True),
        sa.Column("product_name", sa.String(150), nullable=False),
        sa.Column("variant", sa.String(120), nullable=False, server_default=""),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_bravo_order_line_quantity_positive"),
        sa.CheckConstraint("unit_price >= 0", name="ck_bravo_order_line_price_nonnegative"),
    )
    op.create_index("ix_bravo_order_lines_repair_id", "bravo_order_lines", ["repair_id"])


def downgrade() -> None:
    op.drop_index("ix_bravo_order_lines_repair_id", table_name="bravo_order_lines")
    op.drop_table("bravo_order_lines")
