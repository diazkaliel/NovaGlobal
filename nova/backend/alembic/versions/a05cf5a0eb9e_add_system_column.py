"""add_system_column

Revision ID: a05cf5a0eb9e
Revises: d61987024d57
Create Date: 2026-06-23 12:31:48.020424

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a05cf5a0eb9e'
down_revision: Union[str, Sequence[str], None] = 'd61987024d57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('inventory', sa.Column('system', sa.String(length=20), server_default='nova', nullable=False))
    op.add_column('repairs', sa.Column('system', sa.String(length=20), server_default='nova', nullable=False))

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('repairs', 'system')
    op.drop_column('inventory', 'system')
