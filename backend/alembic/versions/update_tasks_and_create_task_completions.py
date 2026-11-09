"""update_tasks_and_create_task_completions

Revision ID: a1b2c3d4e5f6
Revises: <YOUR_PREVIOUS_REVISION_ID>
Create Date: 2026-10-23 14:28:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '1234567890ab'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)

    # ==========================================================
    # 1. ENUMS (Defensive Creation)
    # ==========================================================
    priority_enum = postgresql.ENUM('HIGH', 'MEDIUM', 'LOW', name='priority_ranking', create_type=False)
    has_priority_enum = bind.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'priority_ranking'")).scalar()
    if not has_priority_enum:
        postgresql.ENUM('HIGH', 'MEDIUM', 'LOW', name='priority_ranking').create(bind)

    completion_enum = postgresql.ENUM('completed', 'not_completed', 'skipped', name='completion_status', create_type=False)
    has_completion_enum = bind.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'completion_status'")).scalar()
    if not has_completion_enum:
        postgresql.ENUM('completed', 'not_completed', 'skipped', name='completion_status').create(bind)

    # ==========================================================
    # 2. TASKS TABLE (Defensive Updates / Creation)
    # ==========================================================
    tables = inspector.get_table_names()
    
    if 'tasks' not in tables:
        op.create_table(
            'tasks',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('name', sa.String(length=150), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('description_updated_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('anticipated_duration_minutes', sa.Integer(), nullable=True),
            sa.Column('priority', priority_enum, server_default='MEDIUM', nullable=False),
            sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.CheckConstraint('anticipated_duration_minutes IS NULL OR anticipated_duration_minutes > 0', name='ck_tasks_duration_positive')
        )
    else:
        existing_cols = [c['name'] for c in inspector.get_columns('tasks')]

        # Drop old unique constraint and index tied to target_category if they exist
        has_uq_name_cat = bind.execute(sa.text("SELECT 1 FROM pg_constraint WHERE conname = 'uq_tasks_name_target_category'")).scalar()
        if has_uq_name_cat:
            op.drop_constraint('uq_tasks_name_target_category', 'tasks', type_='unique')

        indexes = [idx['name'] for idx in inspector.get_indexes('tasks')]
        if 'ix_public_tasks_target_category' in indexes:
            op.drop_index('ix_public_tasks_target_category', table_name='tasks')

        # Drop legacy target_category column
        if 'target_category' in existing_cols:
            op.drop_column('tasks', 'target_category')

        # Drop legacy check constraint if present
        has_old_ck = bind.execute(sa.text("SELECT 1 FROM pg_constraint WHERE conname = 'duration_positive'")).scalar()
        if has_old_ck:
            op.drop_constraint('duration_positive', 'tasks', type_='check')

        # Add missing columns
        if 'description_updated_at' not in existing_cols:
            op.add_column('tasks', sa.Column('description_updated_at', sa.DateTime(timezone=True), nullable=True))

        if 'anticipated_duration_minutes' not in existing_cols:
            op.add_column('tasks', sa.Column('anticipated_duration_minutes', sa.Integer(), nullable=True))

        if 'priority' not in existing_cols:
            op.add_column('tasks', sa.Column('priority', priority_enum, server_default='MEDIUM', nullable=False))

        if 'is_active' not in existing_cols:
            op.add_column('tasks', sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False))

        if 'deleted_at' not in existing_cols:
            op.add_column('tasks', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

        # Ensure correct Check Constraint exists
        has_tasks_ck = bind.execute(sa.text("SELECT 1 FROM pg_constraint WHERE conname = 'ck_tasks_duration_positive'")).scalar()
        if not has_tasks_ck:
            op.create_check_constraint('ck_tasks_duration_positive', 'tasks', 'anticipated_duration_minutes IS NULL OR anticipated_duration_minutes > 0')

    # ==========================================================
    # 3. TASK COMPLETIONS TABLE (Clean Fresh Create)
    # ==========================================================
    if 'task_completions' not in tables:
        op.create_table(
            'task_completions',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('diagnosis_task_requirement_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('completed_status', completion_enum, server_default=sa.text("'not_completed'"), nullable=False),
            sa.Column('was_skipped', sa.Boolean(), server_default=sa.text('false'), nullable=False),
            sa.Column('title_override', sa.String(length=150), nullable=True),
            sa.Column('details_override', sa.Text(), nullable=True),
            sa.Column('priority_override', sa.String(length=10), nullable=True),
            sa.Column('due_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('skip_reason', sa.Text(), nullable=True),
            sa.Column('revision', sa.Integer(), server_default=sa.text('0'), nullable=False),
            sa.Column('void_reason', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
            
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='RESTRICT'),
            sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['diagnosis_task_requirement_id'], ['diagnosis_task_requirements.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(
                ['session_id', 'client_id'], 
                ['caregiver_sessions.id', 'caregiver_sessions.client_id'], 
                ondelete='CASCADE', 
                name='fk_task_completions_session_client'
            ),
            sa.UniqueConstraint('session_id', 'task_id', name='uq_task_completions_session_task'),
            sa.CheckConstraint("NOT was_skipped OR completed_status <> 'completed'", name='ck_task_completions_skipped_not_completed'),
            sa.CheckConstraint("priority_override IS NULL OR priority_override IN ('high', 'normal', 'low')", name='ck_task_completions_priority_override'),
            sa.CheckConstraint('revision >= 0', name='ck_task_completions_revision_nonnegative')
        )
        
        op.create_index(op.f('ix_task_completions_task_id'), 'task_completions', ['task_id'], unique=False)
        op.create_index(op.f('ix_task_completions_session_id'), 'task_completions', ['session_id'], unique=False)
        op.create_index(op.f('ix_task_completions_client_id'), 'task_completions', ['client_id'], unique=False)
        op.create_index(op.f('ix_task_completions_diagnosis_task_requirement_id'), 'task_completions', ['diagnosis_task_requirement_id'], unique=False)


def downgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    tables = inspector.get_table_names()

    if 'task_completions' in tables:
        op.drop_index(op.f('ix_task_completions_diagnosis_task_requirement_id'), table_name='task_completions')
        op.drop_index(op.f('ix_task_completions_client_id'), table_name='task_completions')
        op.drop_index(op.f('ix_task_completions_session_id'), table_name='task_completions')
        op.drop_index(op.f('ix_task_completions_task_id'), table_name='task_completions')
        op.drop_table('task_completions')

    if 'tasks' in tables:
        existing_cols = [c['name'] for c in inspector.get_columns('tasks')]
        
        if 'deleted_at' in existing_cols:
            op.drop_column('tasks', 'deleted_at')
        if 'is_active' in existing_cols:
            op.drop_column('tasks', 'is_active')
        if 'priority' in existing_cols:
            op.drop_column('tasks', 'priority')
        if 'anticipated_duration_minutes' in existing_cols:
            op.drop_column('tasks', 'anticipated_duration_minutes')
        if 'description_updated_at' in existing_cols:
            op.drop_column('tasks', 'description_updated_at')
            
        has_tasks_ck = bind.execute(sa.text("SELECT 1 FROM pg_constraint WHERE conname = 'ck_tasks_duration_positive'")).scalar()
        if has_tasks_ck:
            op.drop_constraint('ck_tasks_duration_positive', 'tasks', type_='check')

    sa.Enum(name='completion_status').drop(bind)
    sa.Enum(name='priority_ranking').drop(bind)