-- SoilViews Database Initialization Script
-- Creates extensions and default databases

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Unleash database
CREATE DATABASE unleash;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE soilviews TO soilviews;
GRANT ALL PRIVILEGES ON DATABASE unleash TO soilviews;

-- Create Unleash user
CREATE USER unleash WITH PASSWORD 'unleash';
GRANT ALL PRIVILEGES ON DATABASE unleash TO unleash;

-- Display info
SELECT version();
SELECT PostGIS_version();
