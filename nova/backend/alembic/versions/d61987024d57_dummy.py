"""dummy migration
Revision ID: d61987024d57
Revises: cfb843031699
Create Date: 2026-06-23 12:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd61987024d57'
down_revision: Union[str, Sequence[str], None] = 'cfb843031699'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    pass

def downgrade() -> None:
    pass
