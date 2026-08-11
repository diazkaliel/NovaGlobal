"""merge_product_recipes_and_password_fix

Revision ID: 57371a9a0623
Revises: cae0003a817d, e7381fa09101
Create Date: 2026-08-09 19:04:32.238668

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57371a9a0623'
down_revision: Union[str, Sequence[str], None] = ('cae0003a817d', 'e7381fa09101')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
