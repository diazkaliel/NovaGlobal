"""Secuencia independiente para números de orden BRV sin colisiones por COUNT."""
from alembic import op

revision = "b642fb70c521"
down_revision = "5e04c544ec1d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE bravo_order_number_seq START WITH 1")
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
    op.execute("DROP SEQUENCE IF EXISTS bravo_order_number_seq")
