"""Initial production schema for the ITSM MVP.

Revision ID: 20260922_0001
Revises:
Create Date: 2026-09-22
"""

from alembic import op
import sqlalchemy as sa


revision = "20260922_0001"
down_revision = None
branch_labels = None
depends_on = None


def _has_column(inspector, table: str, column: str) -> bool:
    return column in {item["name"] for item in inspector.get_columns(table)}


def _upgrade_legacy_schema(inspector) -> None:
    """Upgrade the pre-Alembic ``create_all`` schema without discarding data."""
    if _has_column(inspector, "users", "hashed_password") and not _has_column(inspector, "users", "password_hash"):
        op.alter_column("users", "hashed_password", new_column_name="password_hash", existing_type=sa.String(length=255))
    if not _has_column(inspector, "users", "updated_at"):
        op.add_column("users", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))

    if not _has_column(inspector, "customers", "address"):
        op.add_column("customers", sa.Column("address", sa.Text(), nullable=True))
    if not _has_column(inspector, "customers", "updated_at"):
        op.add_column("customers", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))

    if _has_column(inspector, "devices", "hostname") and not _has_column(inspector, "devices", "model"):
        op.alter_column("devices", "hostname", new_column_name="model", existing_type=sa.String(length=255))
    if _has_column(inspector, "devices", "os") and not _has_column(inspector, "devices", "operating_system"):
        op.alter_column("devices", "os", new_column_name="operating_system", existing_type=sa.String(length=100))
    if not _has_column(inspector, "devices", "manufacturer"):
        op.add_column("devices", sa.Column("manufacturer", sa.String(length=100), nullable=True))
        op.execute("UPDATE devices SET manufacturer = 'Unknown' WHERE manufacturer IS NULL")
        op.alter_column("devices", "manufacturer", nullable=False, existing_type=sa.String(length=100))
    if not _has_column(inspector, "devices", "updated_at"):
        op.add_column("devices", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))

    if not _has_column(inspector, "categories", "created_at"):
        op.add_column("categories", sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))
    if _has_column(inspector, "ticket_history", "actor_id") and not _has_column(inspector, "ticket_history", "user_id"):
        op.alter_column("ticket_history", "actor_id", new_column_name="user_id", existing_type=sa.Integer())
    if not _has_column(inspector, "tickets", "updated_at"):
        op.add_column("tickets", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))
    op.execute("UPDATE tickets SET priority = 'CRITICAL' WHERE priority = 'URGENT'")


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "users" in inspector.get_table_names():
        _upgrade_legacy_schema(inspector)
        return
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="customer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint("role IN ('customer', 'technician', 'manager', 'admin')", name="ck_users_role"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_customers_email", "customers", ["email"])
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("device_type", sa.String(length=100), nullable=False),
        sa.Column("manufacturer", sa.String(length=100), nullable=False),
        sa.Column("model", sa.String(length=255), nullable=False),
        sa.Column("serial_number", sa.String(length=255), nullable=True),
        sa.Column("operating_system", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_devices_customer_id", "devices", ["customer_id"])
    op.create_table(
        "tickets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("device_id", sa.Integer(), sa.ForeignKey("devices.id"), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("technician_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="MEDIUM"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="NEW"),
        sa.Column("ai_category", sa.String(length=100), nullable=True),
        sa.Column("ai_confidence", sa.Float(), nullable=True),
        sa.Column("resolution", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')", name="ck_tickets_priority"),
        sa.CheckConstraint("status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED')", name="ck_tickets_status"),
    )
    op.create_index("ix_tickets_customer_id", "tickets", ["customer_id"])
    op.create_index("ix_tickets_technician_id", "tickets", ["technician_id"])
    op.create_index("ix_tickets_status", "tickets", ["status"])
    op.create_table(
        "solutions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("tickets.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_solutions_ticket_id", "solutions", ["ticket_id"])
    op.create_table(
        "ticket_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("tickets.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("old_value", sa.String(length=100), nullable=True),
        sa.Column("new_value", sa.String(length=100), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_ticket_history_ticket_id", "ticket_history", ["ticket_id"])
    # Existing knowledge-base functionality is intentionally preserved.
    op.create_table(
        "articles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_articles_category_id", "articles", ["category_id"])


def downgrade() -> None:
    op.drop_table("articles")
    op.drop_table("ticket_history")
    op.drop_table("solutions")
    op.drop_table("tickets")
    op.drop_table("devices")
    op.drop_table("categories")
    op.drop_table("customers")
    op.drop_table("users")
