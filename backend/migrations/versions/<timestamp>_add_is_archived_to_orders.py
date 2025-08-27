"""add is_archived and archived_at to orders

Revision ID: add_is_archived_to_orders
Revises: <previous_revision>
Create Date: <today's date>

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_is_archived_to_orders'
down_revision = '<previous_revision>'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('orders', sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('orders', sa.Column('archived_at', sa.DateTime(), nullable=True))

def downgrade():
    op.drop_column('orders', 'archived_at')
    op.drop_column('orders', 'is_archived')
