"""merge_product_recipes_and_password_fix

Revision ID: 011919018867
Revises: 57371a9a0623
Create Date: 2026-08-09 19:04:36.720431

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '011919018867'
down_revision: Union[str, Sequence[str], None] = '57371a9a0623'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
