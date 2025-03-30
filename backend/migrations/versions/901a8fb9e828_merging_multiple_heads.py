"""Merging multiple heads

Revision ID: 901a8fb9e828
Revises: 696e165d5cc4, d9b8f0c7e335, ffad036f21f5
Create Date: 2025-03-30 20:03:27.812870

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '901a8fb9e828'
down_revision = ('696e165d5cc4', 'd9b8f0c7e335', 'ffad036f21f5')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
