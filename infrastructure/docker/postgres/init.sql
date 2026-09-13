-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits (scheduled_start);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_events (status, severity);
