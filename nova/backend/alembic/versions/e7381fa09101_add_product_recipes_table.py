"""Add product_recipes table

Revision ID: e7381fa09101
Revises: 0179f5fad5a6
Create Date: 2026-07-30 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7381fa09101'
down_revision: Union[str, Sequence[str], None] = '0179f5fad5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'product_recipes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('insumo_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False, server_default='1.0'),
        sa.ForeignKeyConstraint(['product_id'], ['inventory.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['insumo_id'], ['inventory.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('product_recipes')
