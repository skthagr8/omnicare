"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2024-01-01 00:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry
import uuid

# Revision identifiers
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(20)),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Create indexes
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_role', 'users', ['role'])
    
    # Clients table
    op.create_table(
        'clients',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('date_of_birth', sa.Date, nullable=False),
        sa.Column('address', sa.Text, nullable=False),
        sa.Column('home_location', Geometry(geometry_type='POINT', srid=4326)),
        sa.Column('acuity_level', sa.Integer),
        sa.Column('primary_diagnosis', sa.Text),
        sa.Column('emergency_contact_name', sa.String(255)),
        sa.Column('emergency_contact_phone', sa.String(20)),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Create spatial index
    op.execute('CREATE INDEX ix_clients_home_location ON clients USING GIST (home_location)')
    op.create_index('ix_clients_acuity_level', 'clients', ['acuity_level'])
    
    # Caregivers table
    op.create_table(
        'caregivers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('current_location', Geometry(geometry_type='POINT', srid=4326)),
        sa.Column('is_available', sa.Boolean, default=True),
        sa.Column('certification_level', sa.String(50)),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_caregivers_user_id', 'caregivers', ['user_id'])
    op.create_index('ix_caregivers_is_available', 'caregivers', ['is_available'])
    op.execute('CREATE INDEX ix_caregivers_current_location ON caregivers USING GIST (current_location)')
    
    # Family members table
    op.create_table(
        'family_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE')),
        sa.Column('relationship', sa.String(50)),
        sa.Column('notification_preference', sa.String(20), default='email'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_family_members_user_id', 'family_members', ['user_id'])
    op.create_index('ix_family_members_client_id', 'family_members', ['client_id'])
    
    # Visits table
    op.create_table(
        'visits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE')),
        sa.Column('caregiver_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('caregivers.id', ondelete='CASCADE')),
        sa.Column('scheduled_start', sa.DateTime, nullable=False),
        sa.Column('scheduled_end', sa.DateTime, nullable=False),
        sa.Column('actual_start', sa.DateTime),
        sa.Column('actual_end', sa.DateTime),
        sa.Column('status', sa.String(20), default='scheduled'),
        sa.Column('check_in_location', Geometry(geometry_type='POINT', srid=4326)),
        sa.Column('check_out_location', Geometry(geometry_type='POINT', srid=4326)),
        sa.Column('route_order', sa.Integer),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_visits_client_id', 'visits', ['client_id'])
    op.create_index('ix_visits_caregiver_id', 'visits', ['caregiver_id'])
    op.create_index('ix_visits_status', 'visits', ['status'])
    op.create_index('ix_visits_scheduled_start', 'visits', ['scheduled_start'])
    
    # Assessments table
    op.create_table(
        'assessments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE')),
        sa.Column('caregiver_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('caregivers.id', ondelete='CASCADE')),
        sa.Column('assessment_type', sa.String(50), nullable=False),
        sa.Column('score', postgresql.JSONB, nullable=False),
        sa.Column('completed_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    op.create_index('ix_assessments_client_id', 'assessments', ['client_id'])
    op.create_index('ix_assessments_type', 'assessments', ['assessment_type'])
    op.create_index('ix_assessments_completed_at', 'assessments', ['completed_at'])
    
    # Medications table
    op.create_table(
        'medications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('dosage', sa.String(100)),
        sa.Column('frequency', sa.String(100)),
        sa.Column('instructions', sa.Text),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_medications_client_id', 'medications', ['client_id'])
    
    # Medication logs table
    op.create_table(
        'medication_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('medication_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('medications.id', ondelete='CASCADE')),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('visits.id', ondelete='CASCADE')),
        sa.Column('administered_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('administered_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('caregivers.id', ondelete='CASCADE')),
        sa.Column('status', sa.String(20), default='administered'),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    op.create_index('ix_medication_logs_medication_id', 'medication_logs', ['medication_id'])
    op.create_index('ix_medication_logs_visit_id', 'medication_logs', ['visit_id'])
    
    # Emergency events table
    op.create_table(
        'emergency_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE')),
        sa.Column('caregiver_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('caregivers.id', ondelete='CASCADE')),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('location', Geometry(geometry_type='POINT', srid=4326)),
        sa.Column('details', postgresql.JSONB),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('resolved_at', sa.DateTime),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    op.create_index('ix_emergency_events_client_id', 'emergency_events', ['client_id'])
    op.create_index('ix_emergency_events_status', 'emergency_events', ['status'])
    op.create_index('ix_emergency_events_created_at', 'emergency_events', ['created_at'])
    
    # Emergency outbox table
    op.create_table(
        'emergency_outbox',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('event_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('emergency_events.id', ondelete='CASCADE')),
        sa.Column('payload', postgresql.JSONB, nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('retry_count', sa.Integer, default=0),
        sa.Column('twilio_message_sid', sa.String(255)),
        sa.Column('next_retry_at', sa.DateTime),
        sa.Column('processed_at', sa.DateTime),
        sa.Column('error_message', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    op.create_index('ix_emergency_outbox_status', 'emergency_outbox', ['status'])
    op.create_index('ix_emergency_outbox_event_id', 'emergency_outbox', ['event_id'])
    op.create_index('ix_emergency_outbox_created_at', 'emergency_outbox', ['created_at'])
    
    # Audit logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(50)),
        sa.Column('resource_id', postgresql.UUID(as_uuid=True)),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.String(255)),
        sa.Column('details', postgresql.JSONB),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('audit_logs')
    op.drop_table('emergency_outbox')
    op.drop_table('emergency_events')
    op.drop_table('medication_logs')
    op.drop_table('medications')
    op.drop_table('assessments')
    op.drop_table('visits')
    op.drop_table('family_members')
    op.drop_table('caregivers')
    op.drop_table('clients')
    op.drop_table('users')
    
    # Drop extensions
    op.execute('DROP EXTENSION IF EXISTS postgis')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
