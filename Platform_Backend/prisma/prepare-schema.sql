-- Keep platform administration tables separate from shared Tenant_backend tables.
-- This script is safe to run repeatedly and does not modify the public schema.
CREATE SCHEMA IF NOT EXISTS edusphere_platform;
