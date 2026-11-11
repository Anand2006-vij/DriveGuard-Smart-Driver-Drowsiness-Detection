-- ============================================================
--  DriveGuard – Supabase Schema
--  Paste this entire file into Supabase → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Admins ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin','admin','viewer')),
  is_active    BOOLEAN DEFAULT TRUE,
  last_login   TIMESTAMPTZ,
  permissions  JSONB DEFAULT '{"manageDrivers":true,"viewAlerts":true,"manageAlerts":true,"viewReports":true,"manageSystem":false}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Drivers ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  email                   TEXT UNIQUE NOT NULL,
  phone                   TEXT NOT NULL,
  date_of_birth           DATE,
  gender                  TEXT CHECK (gender IN ('male','female','other')),
  avatar                  TEXT DEFAULT '',
  -- Address
  street                  TEXT,
  city                    TEXT,
  state                   TEXT,
  zip_code                TEXT,
  country                 TEXT DEFAULT 'India',
  -- License & Employment
  license_number          TEXT UNIQUE NOT NULL,
  license_expiry          DATE,
  license_type            TEXT DEFAULT 'LMV' CHECK (license_type IN ('LMV','HMV','HGMV','PSV','Transport')),
  employee_id             TEXT UNIQUE,
  department              TEXT,
  joining_date            DATE DEFAULT CURRENT_DATE,
  shift_timing            TEXT DEFAULT 'morning' CHECK (shift_timing IN ('morning','afternoon','night','flexible')),
  -- Vehicle
  vehicle_number          TEXT,
  vehicle_type            TEXT DEFAULT 'car' CHECK (vehicle_type IN ('car','truck','bus','bike','van')),
  vehicle_model           TEXT,
  -- Device
  device_id               TEXT UNIQUE,
  device_status           TEXT DEFAULT 'unassigned' CHECK (device_status IN ('assigned','unassigned','faulty')),
  -- Status
  current_status          TEXT DEFAULT 'offline' CHECK (current_status IN ('active','inactive','drowsy','accident','offline')),
  is_active               BOOLEAN DEFAULT TRUE,
  last_seen               TIMESTAMPTZ,
  last_latitude           FLOAT DEFAULT 0,
  last_longitude          FLOAT DEFAULT 0,
  -- Stats
  total_driving_hours     INTEGER DEFAULT 0,
  total_alerts            INTEGER DEFAULT 0,
  total_accidents         INTEGER DEFAULT 0,
  total_drowsiness_events INTEGER DEFAULT 0,
  -- Health
  blood_group             TEXT,
  medical_conditions      TEXT[],
  emergency_name          TEXT,
  emergency_phone         TEXT,
  emergency_relation      TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sensor Readings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_readings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id           UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  device_id           TEXT NOT NULL,
  -- Eye / Camera
  eye_closure_percent FLOAT DEFAULT 0,
  blink_rate          INTEGER DEFAULT 0,
  yawn_detected       BOOLEAN DEFAULT FALSE,
  face_detected       BOOLEAN DEFAULT TRUE,
  -- MPU6050
  acceleration_x      FLOAT DEFAULT 0,
  acceleration_y      FLOAT DEFAULT 0,
  acceleration_z      FLOAT DEFAULT 0,
  gyro_x              FLOAT DEFAULT 0,
  gyro_y              FLOAT DEFAULT 0,
  gyro_z              FLOAT DEFAULT 0,
  tilt_angle          FLOAT DEFAULT 0,
  -- GPS
  latitude            FLOAT DEFAULT 0,
  longitude           FLOAT DEFAULT 0,
  speed               FLOAT DEFAULT 0,
  altitude            FLOAT DEFAULT 0,
  -- Analysis
  drowsiness_level    TEXT DEFAULT 'normal' CHECK (drowsiness_level IN ('normal','low','medium','high','critical')),
  is_drowsy           BOOLEAN DEFAULT FALSE,
  is_accident         BOOLEAN DEFAULT FALSE,
  drowsiness_score    FLOAT DEFAULT 0,
  -- System
  battery_level       FLOAT DEFAULT 100,
  signal_strength     FLOAT DEFAULT 0,
  temperature         FLOAT DEFAULT 0,
  timestamp           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_driver   ON sensor_readings(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_ts       ON sensor_readings(timestamp DESC);

-- ── Alerts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id                   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  device_id                   TEXT NOT NULL,
  sensor_reading_id           UUID REFERENCES sensor_readings(id),
  type                        TEXT NOT NULL CHECK (type IN ('drowsiness','accident','speeding','device_offline','system')),
  severity                    TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  message                     TEXT NOT NULL,
  description                 TEXT,
  latitude                    FLOAT DEFAULT 0,
  longitude                   FLOAT DEFAULT 0,
  location_name               TEXT,
  status                      TEXT DEFAULT 'active' CHECK (status IN ('active','acknowledged','resolved','dismissed')),
  acknowledged_by             UUID REFERENCES admins(id),
  acknowledged_at             TIMESTAMPTZ,
  resolved_at                 TIMESTAMPTZ,
  resolution_notes            TEXT,
  notification_sent           BOOLEAN DEFAULT FALSE,
  emergency_contact_notified  BOOLEAN DEFAULT FALSE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_created  ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status   ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_driver   ON alerts(driver_id);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admins_updated   BEFORE UPDATE ON admins   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_updated  BEFORE UPDATE ON drivers  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_alerts_updated   BEFORE UPDATE ON alerts   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS (disable for service key access) ─────────────────────
ALTER TABLE admins          DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers         DISABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          DISABLE ROW LEVEL SECURITY;

-- ── Seed superadmin (password: Admin@123) ────────────────────
-- bcrypt hash of "Admin@123"
INSERT INTO admins (first_name, last_name, email, password, role, permissions)
VALUES (
  'Super', 'Admin', 'admin@fleet.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgK.2OzB0KPFdIpLYoWxqK',
  'superadmin',
  '{"manageDrivers":true,"viewAlerts":true,"manageAlerts":true,"viewReports":true,"manageSystem":true}'
)
ON CONFLICT (email) DO NOTHING;
