"""Persist master modules previously initialized only at server startup.

Existing installations may already contain these objects. Add only missing ones.
"""
from alembic import op
import sqlalchemy as sa

revision = "ce62d881f205"
down_revision = "ba51c992e104"
branch_labels = None
depends_on = None


def _create_table(name, *elements):
    if not sa.inspect(op.get_bind()).has_table(name):
        op.create_table(name, *elements)


def _add_column(table, column):
    columns = {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}
    if column.name not in columns:
        op.add_column(table, column)


def upgrade():
    _create_table('pricing_rules',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('technique', sa.String(length=50), nullable=False),
    sa.Column('rate_per_cm2', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('setup_cost', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('technique')
    )
    _create_table('attendance_records',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('clock_in', sa.DateTime(timezone=True), nullable=False),
    sa.Column('clock_out', sa.DateTime(timezone=True), nullable=True),
    sa.Column('total_minutes', sa.Integer(), nullable=True),
    sa.Column('system', sa.String(length=20), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_table('bravo_orders',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('order_number', sa.String(length=20), nullable=False),
    sa.Column('client_id', sa.Integer(), nullable=False),
    sa.Column('technician_id', sa.Integer(), nullable=True),
    sa.Column('item_category', sa.String(length=150), nullable=False),
    sa.Column('brand', sa.String(length=150), nullable=False),
    sa.Column('model', sa.String(length=500), nullable=False),
    sa.Column('garment_color', sa.String(length=30), nullable=True),
    sa.Column('garment_size', sa.String(length=10), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('reported_issue', sa.Text(), nullable=False),
    sa.Column('accessories', sa.Text(), nullable=True),
    sa.Column('print_technique', sa.String(length=50), nullable=True),
    sa.Column('print_location', sa.String(length=100), nullable=True),
    sa.Column('print_dimensions', sa.String(length=50), nullable=True),
    sa.Column('design_file_url', sa.Text(), nullable=True),
    sa.Column('mockup_file_url', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('estimated_delivery', sa.Date(), nullable=True),
    sa.Column('order_cost', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('deposit', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('deposit_payment_method', sa.String(length=50), nullable=True),
    sa.Column('final_payment_method', sa.String(length=50), nullable=True),
    sa.Column('parent_order_id', sa.Integer(), nullable=True),
    sa.Column('is_split_child', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
    sa.ForeignKeyConstraint(['parent_order_id'], ['bravo_orders.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['technician_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    _create_table('products_3d',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('sku', sa.String(length=50), nullable=False),
    sa.Column('glb_url', sa.String(length=255), nullable=True),
    sa.Column('procedural_type', sa.String(length=50), nullable=True),
    sa.Column('base_color_hex', sa.String(length=10), nullable=False),
    sa.Column('available_colors', sa.JSON(), nullable=False),
    sa.Column('print_zones', sa.JSON(), nullable=False),
    sa.Column('camera_presets', sa.JSON(), nullable=False),
    sa.Column('base_price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('inventory_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['inventory_id'], ['inventory.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('sku')
    )
    _create_table('quotations',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('system', sa.String(length=20), nullable=False),
    sa.Column('quote_number', sa.String(length=20), nullable=False),
    sa.Column('client_id', sa.Integer(), nullable=True),
    sa.Column('client_name', sa.String(length=150), nullable=True),
    sa.Column('client_email', sa.String(length=150), nullable=True),
    sa.Column('client_phone', sa.String(length=30), nullable=True),
    sa.Column('valid_until', sa.Date(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('terms', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('subtotal', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('discount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('total', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('created_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('quote_number')
    )
    _create_table('bravo_order_comments',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('sender', sa.String(length=20), nullable=False),
    sa.Column('author_name', sa.String(length=100), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('created_at', sa.String(length=50), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['order_id'], ['bravo_orders.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_table('bravo_order_history',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('previous_status', sa.String(length=30), nullable=True),
    sa.Column('new_status', sa.String(length=30), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('changed_by_id', sa.Integer(), nullable=True),
    sa.Column('changed_at', sa.String(length=50), nullable=False),
    sa.ForeignKeyConstraint(['changed_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['order_id'], ['bravo_orders.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_table('bravo_order_inventory',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['inventory.id'], ),
    sa.ForeignKeyConstraint(['order_id'], ['bravo_orders.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_table('customization_sessions',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('session_token', sa.String(length=100), nullable=False),
    sa.Column('product_3d_id', sa.Integer(), nullable=False),
    sa.Column('selected_color_hex', sa.String(length=10), nullable=False),
    sa.Column('technique', sa.String(length=30), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('decals_config', sa.JSON(), nullable=False),
    sa.Column('pricing_breakdown', sa.JSON(), nullable=False),
    sa.Column('total_price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('preview_image_url', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['product_3d_id'], ['products_3d.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _create_table('quotation_items',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('quotation_id', sa.Integer(), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('subtotal', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('inventory_item_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['inventory_item_id'], ['inventory.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    _add_column('clients', sa.Column('system', sa.String(length=20), server_default='nova', nullable=False))
    _add_column('users', sa.Column('system', sa.String(length=20), server_default='all', nullable=False))
    _add_column('web_config', sa.Column('content', sa.JSON(), server_default=sa.text("'{}'::json"), nullable=False))

    for column in ("phone", "rut", "email"):
        op.execute(sa.text(f"ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_{column}_key"))
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_client_phone_system ON clients (phone, system)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_client_rut_system ON clients (rut, system) WHERE rut IS NOT NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clients_system ON clients (system)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_bravo_orders_order_number ON bravo_orders (order_number)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_bravo_orders_status ON bravo_orders (status)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_customization_sessions_session_token ON customization_sessions (session_token)")
    # Widen legacy fields; never shorten a column already expanded by the host.
    lengths = {"device_type": 150, "brand": 150, "model": 500, "print_location": 255, "print_dimensions": 100}
    for column in sa.inspect(op.get_bind()).get_columns("repairs"):
        minimum = lengths.get(column["name"])
        current = getattr(column["type"], "length", None)
        if minimum and current and current < minimum:
            op.alter_column("repairs", column["name"], type_=sa.String(minimum), existing_type=column["type"])


def downgrade():
    # These tables may predate this migration and contain production records.
    raise RuntimeError("Restore a verified backup to revert the master schema reconciliation")
