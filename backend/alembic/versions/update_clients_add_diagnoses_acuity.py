"""update_clients_add_diagnoses_acuity

Revision ID: 1234567890ab
Revises: c824f02e54fd
Create Date: 2026-10-23 13:26:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector
import geoalchemy2

# revision identifiers, used by Alembic.
revision = '1234567890ab'
down_revision = 'c824f02e54fd'  
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    existing_tables = inspector.get_table_names()

    # ==========================================================
    # 1. ENUMS (Defensive Creation)
    # ==========================================================
    for enum_name, enum_values in [
        ('client_diagnosis_category', ('DEMENTIA', 'POST_STROKE', 'PARKINSONS', 'OTHER')),
        ('acuity_level', ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        ('assessment_type', ('CMAI', 'DELIRIUM', 'OTHER'))
    ]:
        exists = bind.execute(
            sa.text("SELECT 1 FROM pg_type WHERE typname = :name"), 
            {"name": enum_name}
        ).scalar()
        if not exists:
            sa.Enum(*enum_values, name=enum_name).create(bind)

    # ==========================================================
    # 2. CLIENTS TABLE UPDATES (Defensive Column Management)
    # ==========================================================
    client_columns = [c['name'] for c in inspector.get_columns('clients')]
    
    if 'assessment_observations' not in client_columns:
        op.add_column('clients', sa.Column('assessment_observations', sa.Text(), nullable=True))
        
    if 'residence' not in client_columns:
        op.add_column('clients', sa.Column('residence', sa.String(length=300), nullable=False, server_default='Unknown'))
        op.alter_column('clients', 'residence', server_default=None)

    if 'gender' not in client_columns:
        op.add_column('clients', sa.Column('gender', sa.String(length=20), nullable=False, server_default='Unknown'))
        op.alter_column('clients', 'gender', server_default=None)

    if 'diagnosis_category' in client_columns:
        op.drop_column('clients', 'diagnosis_category')
        
    if 'acuity_tier' in client_columns:
        op.drop_column('clients', 'acuity_tier')

    # ==========================================================
    # 3. DIAGNOSIS DEFINITIONS & REQUIREMENTS (Defensive Tables)
    # ==========================================================
    if 'diagnosis_definitions' not in existing_tables:
        op.create_table('diagnosis_definitions',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('category', postgresql.ENUM('DEMENTIA', 'POST_STROKE', 'PARKINSONS', 'OTHER', name='client_diagnosis_category', create_type=False), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('category')
        )

    if 'diagnosis_task_requirements' not in existing_tables:
        op.create_table('diagnosis_task_requirements',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('diagnosis_definition_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('is_required', sa.Boolean(), nullable=False),
            sa.Column('sequence_order', sa.Integer(), nullable=False),
            sa.Column('instructions', sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(['diagnosis_definition_id'], ['diagnosis_definitions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='RESTRICT'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('diagnosis_definition_id', 'task_id', name='uq_diagnosis_task_requirement'),
            sa.CheckConstraint('sequence_order >= 0', name='ck_diagnosis_task_sequence_nonnegative')
        )

    if 'diagnosis_assessment_requirements' not in existing_tables:
        op.create_table('diagnosis_assessment_requirements',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('diagnosis_definition_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('assessment_type', postgresql.ENUM('CMAI', 'DELIRIUM', 'OTHER', name='assessment_type', create_type=False), nullable=False),
            sa.Column('is_required', sa.Boolean(), nullable=False),
            sa.Column('frequency_days', sa.Integer(), nullable=True),
            sa.Column('instructions', sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(['diagnosis_definition_id'], ['diagnosis_definitions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    if 'diagnosis_medication_requirements' not in existing_tables:
        op.create_table('diagnosis_medication_requirements',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('diagnosis_definition_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('medication_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('is_required', sa.Boolean(), nullable=False),
            sa.Column('instructions', sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(['diagnosis_definition_id'], ['diagnosis_definitions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['medication_id'], ['medications.id'], ondelete='RESTRICT'),
            sa.PrimaryKeyConstraint('id')
        )

    # ==========================================================
    # 4. CLIENT DIAGNOSES (Polymorphic)
    # ==========================================================
    if 'client_diagnoses' not in existing_tables:
        op.create_table('client_diagnoses',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('diagnosis_definition_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('category', postgresql.ENUM('DEMENTIA', 'POST_STROKE', 'PARKINSONS', 'OTHER', name='client_diagnosis_category', create_type=False), nullable=False),
            sa.Column('diagnosed_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['diagnosis_definition_id'], ['diagnosis_definitions.id'], ondelete='RESTRICT'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_client_diagnoses_client_id'), 'client_diagnoses', ['client_id'], unique=False)
        op.create_index(op.f('ix_client_diagnoses_category'), 'client_diagnoses', ['category'], unique=False)

    if 'dementia_diagnoses' not in existing_tables:
        op.create_table('dementia_diagnoses',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('stage', sa.String(length=50), nullable=True),
            sa.ForeignKeyConstraint(['id'], ['client_diagnoses.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    if 'post_stroke_diagnoses' not in existing_tables:
        op.create_table('post_stroke_diagnoses',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('affected_side', sa.String(length=20), nullable=True),
            sa.ForeignKeyConstraint(['id'], ['client_diagnoses.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    if 'parkinsons_diagnoses' not in existing_tables:
        op.create_table('parkinsons_diagnoses',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.ForeignKeyConstraint(['id'], ['client_diagnoses.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    # ==========================================================
    # 5. CLIENT ACUITY
    # ==========================================================
    if 'client_acuity_tiers' not in existing_tables:
        op.create_table('client_acuity_tiers',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('level', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='acuity_level', create_type=False), nullable=False),
            sa.Column('reason_notes', sa.Text(), nullable=True),
            sa.Column('assigned_by', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('effective_from', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('effective_to', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='RESTRICT'),
            sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    # ==========================================================
    # 6. EMERGENCY CONTACTS & FAMILY LINKS
    # ==========================================================
    if 'client_emergency_contacts' not in existing_tables:
        op.create_table('client_emergency_contacts',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('full_name', sa.String(length=150), nullable=False),
            sa.Column('relationship_type', sa.String(length=50), nullable=False),
            sa.Column('phone', sa.String(length=30), nullable=False),
            sa.Column('is_primary', sa.Boolean(), nullable=False),
            sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

    if 'client_family_links' not in existing_tables:
        op.create_table('client_family_links',
            sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('family_member_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('is_primary_contact', sa.Boolean(), nullable=False),
            sa.Column('linked_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['family_member_id'], ['family_members.user_id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('client_id', 'family_member_id')
        )


def downgrade():
    op.drop_table('client_family_links')
    op.drop_table('client_emergency_contacts')
    op.drop_table('client_acuity_tiers')
    op.drop_table('parkinsons_diagnoses')
    op.drop_table('post_stroke_diagnoses')
    op.drop_table('dementia_diagnoses')
    op.drop_table('client_diagnoses')
    op.drop_table('diagnosis_medication_requirements')
    op.drop_table('diagnosis_assessment_requirements')
    op.drop_table('diagnosis_task_requirements')
    op.drop_table('diagnosis_definitions')
    
    op.drop_column('clients', 'gender')
    op.drop_column('clients', 'residence')
    op.drop_column('clients', 'assessment_observations')
    
    op.add_column('clients', sa.Column('acuity_tier', postgresql.ENUM(name='acuity_tier', create_type=False), nullable=True))
    op.add_column('clients', sa.Column('diagnosis_category', postgresql.ENUM(name='diagnosis_category', create_type=False), nullable=True))
    
    sa.Enum(name='client_diagnosis_category').drop(op.get_bind())
    sa.Enum(name='acuity_level').drop(op.get_bind())
    sa.Enum(name='assessment_type').drop(op.get_bind())
