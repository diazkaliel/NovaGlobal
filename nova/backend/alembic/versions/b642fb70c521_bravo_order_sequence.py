"""Secuencia independiente para números de orden BRV sin colisiones por COUNT."""
from alembic import op
import sqlalchemy as sa

revision = "b642fb70c521"
down_revision = "906ba7e24d46"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE bravo_order_number_seq START WITH 1")
    op.add_column("repairs", sa.Column("design_reference", sa.String(500), nullable=True))
    op.execute("""
        SELECT setval(
            'bravo_order_number_seq',
            COALESCE(
                (SELECT MAX(SUBSTRING(order_number FROM 5)::BIGINT)
                 FROM repairs WHERE order_number ~ '^BRV-[0-9]+$'),
                1
            ),
            EXISTS (
                SELECT 1 FROM repairs WHERE order_number ~ '^BRV-[0-9]+$'
            )
        )
    """)


def downgrade() -> None:
    op.drop_column("repairs", "design_reference")
    op.execute("DROP SEQUENCE IF EXISTS bravo_order_number_seq")
