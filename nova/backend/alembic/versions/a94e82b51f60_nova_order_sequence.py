"""Numeración Nova compatible con órdenes existentes y creaciones simultáneas."""
from alembic import op

revision = "a94e82b51f60"
down_revision = "f6b7a4d102c9"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("LOCK TABLE repairs IN SHARE ROW EXCLUSIVE MODE")
    op.execute("CREATE SEQUENCE nova_order_number_seq START WITH 1")
    op.execute("""
        SELECT setval(
            'nova_order_number_seq',
            GREATEST(COALESCE(
                (SELECT MAX(SUBSTRING(order_number FROM 5)::BIGINT)
                 FROM repairs WHERE order_number ~ '^ORD-[0-9]+$'), 1
            ), 1),
            EXISTS (
                SELECT 1 FROM repairs WHERE order_number ~ '^ORD-[0-9]+$'
            )
        )
    """)


def downgrade():
    op.execute("DROP SEQUENCE nova_order_number_seq")
