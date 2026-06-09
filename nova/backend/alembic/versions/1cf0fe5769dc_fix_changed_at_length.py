"""fix changed_at length

Revision ID: 1cf0fe5769dc
Revises: f19c8605e1a6
Create Date: 2026-06-06 12:05:34.095878

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1cf0fe5769dc'
down_revision: Union[str, Sequence[str], None] = 'f19c8605e1a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('repair_history', 'changed_at',
               existing_type=sa.VARCHAR(length=30),
               type_=sa.VARCHAR(length=50),
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('repair_history', 'changed_at',
               existing_type=sa.VARCHAR(length=50),
               type_=sa.VARCHAR(length=30),
               existing_nullable=False)