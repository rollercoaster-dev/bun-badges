-- Initialize the test database

-- Make sure the database exists (should already be created from environment variables)
\c bun_badges_test;

-- Create extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schemas if needed (note: this is optional and depends on your app structure)
-- CREATE SCHEMA IF NOT EXISTS app_public;

-- Create any required functions
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create testing roles with limited permissions if needed for role-based testing
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'test_read_role') THEN
      CREATE ROLE test_read_role;
   END IF;
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'test_write_role') THEN
      CREATE ROLE test_write_role;
   END IF;
END
$do$;

-- Create basic test data
-- These will be additional to any migrations run by the app
CREATE TABLE IF NOT EXISTS test_metadata (
  id SERIAL PRIMARY KEY,
  test_name TEXT NOT NULL,
  last_run TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL
);

-- Insert initial test metadata
INSERT INTO test_metadata (test_name, status)
VALUES 
  ('e2e_setup', 'initialized'),
  ('database_connection', 'ready');

-- Grant permissions to test roles
GRANT SELECT ON ALL TABLES IN SCHEMA public TO test_read_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO test_write_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO test_write_role; 