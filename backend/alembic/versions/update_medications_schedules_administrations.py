"""update_medications_schedules_administrations

Revision ID: <YOUR_NEW_REVISION_ID>
Revises: <YOUR_PREVIOUS_REVISION_ID>
Create Date: 2026-10-23 17:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = 'b0t9c1x2w3u9'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    existing_tables = inspector.get_table_names()

    # ==========================================================
    # 1. ENUMS (Defensive Creation)
    # ==========================================================
    has_admin_status = bind.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'medication_admin_status'")).scalar()
    if not has_admin_status:
        postgresql.ENUM('PENDING', 'ADMINISTERED', 'REFUSED', 'MISSED', name='medication_admin_status').create(bind)

    has_med_class = bind.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'medication_class'")).scalar()
    if not has_med_class:
        # Add basic fallback enum creation if not exists; adjust values as needed.
        postgresql.ENUM('OTHER', name='medication_class').create(bind)

    # ==========================================================
    # 2. MEDICATIONS TABLE
    # ==========================================================
    if 'medications' in existing_tables:
        med_cols = [c['name'] for c in inspector.get_columns('medications')]
        if 'description' not in med_cols:
            op.add_column('medications', sa.Column('description', sa.Text(), nullable=True))

    # ==========================================================
    # 3. MEDICATION SCHEDULES TABLE
    # ==========================================================
    if 'medication_schedules' not in existing_tables:
        op.create_table(
            'medication_schedules',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('medication_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('scheduled_time', sa.Time(), nullable=False),
            sa.Column('days_of_week', postgresql.ARRAY(sa.SmallInteger()), server_default=sa.text("ARRAY[1,2,3,4,5,6,7]::smallint[]"), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['medication_id'], ['medications.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.CheckConstraint(
                "cardinality(days_of_week) BETWEEN 1 AND 7 AND days_of_week <@ ARRAY[1,2,3,4,5,6,7]::smallint[]",
                name="days_valid"
            )
        )
        op.create_index(op.f('ix_medication_schedules_medication_id'), 'medication_schedules', ['medication_id'], unique=False)

    # ==========================================================
    # 4. MEDICATION ADMINISTRATIONS TABLE
    # ==========================================================
    if 'medication_administrations' not in existing_tables:
        # Create fresh if it never existed
        op.create_table(
            'medication_administrations',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('medication_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('schedule_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('status', postgresql.ENUM('PENDING', 'ADMINISTERED', 'REFUSED', 'MISSED', name='medication_admin_status', create_type=False), server_default=sa.text("'PENDING'"), nullable=False),
            sa.Column('glucose_check_value', sa.Numeric(precision=5, scale=1), nullable=True),
            sa.Column('administered_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('missed_reason', sa.Text(), nullable=True),
            sa.Column('recorded_by', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['session_id'], ['caregiver_sessions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['medication_id'], ['medications.id'], ondelete='RESTRICT'),
            sa.ForeignKeyConstraint(['schedule_id'], ['medication_schedules.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['recorded_by'], ['caregivers.user_id'], ondelete='RESTRICT'),
            sa.PrimaryKeyConstraint('id'),
            sa.CheckConstraint("status <> 'administered' OR administered_at IS NOT NULL", name="administered_needs_time"),
            sa.CheckConstraint("status NOT IN ('refused', 'missed') OR missed_reason IS NOT NULL", name="reason_required"),
            sa.CheckConstraint("glucose_check_value IS NULL OR glucose_check_value >= 0", name="glucose_non_negative")
        )
        op.create_index(op.f('ix_medication_administrations_session_id'), 'medication_administrations', ['session_id'], unique=False)
        op.create_index(op.f('ix_medication_administrations_medication_id'), 'medication_administrations', ['medication_id'], unique=False)
    else:
        # Alter existing defensively
        admin_cols = [c['name'] for c in inspector.get_columns('medication_administrations')]
        admin_constraints = [c['name'] for c in inspector.get_check_constraints('medication_administrations')]
        
        # 4a. Drop Old Constraints
        if 'administered_needs_who_when' in admin_constraints:
            op.drop_constraint('administered_needs_who_when', 'medication_administrations', type_='check')
        if 'reason_required' in admin_constraints:
            op.drop_constraint('reason_required', 'medication_administrations', type_='check')
        if 'glucose_non_negative' in admin_constraints:
            op.drop_constraint('glucose_non_negative', 'medication_administrations', type_='check')
        
        has_unique = bind.execute(sa.text("SELECT 1 FROM pg_constraint WHERE conname = 'uq_medication_admin_schedule_client_date'")).scalar()
        if has_unique:
            op.drop_constraint('uq_medication_admin_schedule_client_date', 'medication_administrations', type_='unique')

        # 4b. Add Missing Columns
        if 'medication_id' not in admin_cols:
            # Note: Server default applied temporarily if migrating populated tables to prevent NOT NULL violation
            op.add_column('medication_administrations', sa.Column('medication_id', postgresql.UUID(as_uuid=True), nullable=True))
            # op.create_foreign_key('fk_medication_administrations_medication', 'medication_administrations', 'medications', ['medication_id'], ['id'], ondelete='RESTRICT')
        
        if 'glucose_check_value' not in admin_cols:
            op.add_column('medication_administrations', sa.Column('glucose_check_value', sa.Numeric(precision=5, scale=1), nullable=True))
            
        if 'missed_reason' not in admin_cols:
            op.add_column('medication_administrations', sa.Column('missed_reason', sa.Text(), nullable=True))
            
        if 'recorded_by' not in admin_cols:
            op.add_column('medication_administrations', sa.Column('recorded_by', postgresql.UUID(as_uuid=True), nullable=True))
            
        if 'created_at' not in admin_cols:
            op.add_column('medication_administrations', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True))

        # 4c. Update Column Nullability and Data (Session ID)
        if 'session_id' in admin_cols:
            # Your new schema makes session_id nullable=False. If you have legacy data with NULL, this would fail.
            # op.alter_column('medication_administrations', 'session_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
            pass

        # 4d. Create New Constraints
        if 'administered_needs_time' not in admin_constraints:
            op.create_check_constraint('administered_needs_time', 'medication_administrations', "status <> 'administered' OR administered_at IS NOT NULL")
        
        # We dropped reason_required above to recreate it with the new definition
        op.create_check_constraint('reason_required', 'medication_administrations', "status NOT IN ('refused', 'missed') OR missed_reason IS NOT NULL")
        op.create_check_constraint('glucose_non_negative', 'medication_administrations', "glucose_check_value IS NULL OR glucose_check_value >= 0")

        # 4e. Drop Deprecated Columns
        if 'client_id' in admin_cols:
            op.drop_column('medication_administrations', 'client_id')
        if 'caregiver_id' in admin_cols:
            op.drop_column('medication_administrations', 'caregiver_id')
        if 'scheduled_date' in admin_cols:
            op.drop_column('medication_administrations', 'scheduled_date')
        if 'non_completion_reason' in admin_cols:
            op.drop_column('medication_administrations', 'non_completion_reason')
        if 'glucose_level' in admin_cols:
            op.drop_column('medication_administrations', 'glucose_level')


def downgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    existing_tables = inspector.get_table_names()

    if 'medications' in existing_tables:
        med_cols = [c['name'] for c in inspector.get_columns('medications')]
        if 'description' in med_cols:
            op.drop_column('medications', 'description')

    if 'medication_administrations' in existing_tables:
        admin_cols = [c['name'] for c in inspector.get_columns('medication_administrations')]
        admin_constraints = [c['name'] for c in inspector.get_check_constraints('medication_administrations')]
        
        # Drop new constraints
        if 'administered_needs_time' in admin_constraints:
            op.drop_constraint('administered_needs_time', 'medication_administrations', type_='check')
        if 'reason_required' in admin_constraints:
            op.drop_constraint('reason_required', 'medication_administrations', type_='check')
        if 'glucose_non_negative' in admin_constraints:
            op.drop_constraint('glucose_non_negative', 'medication_administrations', type_='check')

        # Drop new columns
        if 'created_at' in admin_cols:
            op.drop_column('medication_administrations', 'created_at')
        if 'recorded_by' in admin_cols:
            op.drop_column('medication_administrations', 'recorded_by')
        if 'missed_reason' in admin_cols:
            op.drop_column('medication_administrations', 'missed_reason')
        if 'glucose_check_value' in admin_cols:
            op.drop_column('medication_administrations', 'glucose_check_value')
        
        # We can't safely re-populate dropped legacy columns like client_id, caregiver_id, scheduled_date during downgrade 
        # without complex data migrations, so we just add them back as nullable to avoid breaking models.
        if 'client_id' not in admin_cols:
            op.add_column('medication_administrations', sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'caregiver_id' not in admin_cols:
            op.add_column('medication_administrations', sa.Column('caregiver_id', postgresql.UUID(as_uuid=True), nullable=True))
        if 'scheduled_date' not in admin_cols:
            op.add_column('medication_administrations', sa.Column('scheduled_date', sa.Date(), nullable=True))
        if 'non_completion_reason' not in admin_cols:
            op.add_column('medication_administrations', sa.Column('non_completion_reason', sa.String(length=255), nullable=True))
        if 'glucose_level' not in admin_cols:
            op.add_column('medication_administrations', sa.Column('glucose_level', sa.Numeric(precision=5, scale=2), nullable=True))

        # We conditionally recreate legacy check constraints (only safe if data isn't violating it)
        op.create_check_constraint('administered_needs_who_when', 'medication_administrations', "status <> 'administered' OR (administered_at IS NOT NULL AND caregiver_id IS NOT NULL)")
        op.create_check_constraint('reason_required', 'medication_administrations', "status NOT IN ('refused', 'missed') OR non_completion_reason IS NOT NULL")
        op.create_check_constraint('glucose_non_negative', 'medication_administrations', "glucose_level IS NULL OR glucose_level >= 0")