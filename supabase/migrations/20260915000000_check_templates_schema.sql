-- 20260915000000_check_templates_schema.sql
-- Production-Grade Check Templates and Fields Schema with Multi-Bank Seeds

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS check_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  width_mm NUMERIC(6,2) NOT NULL DEFAULT 178.00,
  height_mm NUMERIC(6,2) NOT NULL DEFAULT 74.00,
  payee_account_only BOOLEAN DEFAULT FALSE,
  stamp_config JSONB DEFAULT '{"x": 0, "y": 7, "angle": -24, "width": 30}'::jsonb,
  printer_offset_x_mm NUMERIC(5,2) DEFAULT 0.00,
  printer_offset_y_mm NUMERIC(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES check_templates(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  x_mm NUMERIC(6,2) NOT NULL,
  y_mm NUMERIC(6,2) NOT NULL,
  font_size_pt NUMERIC(5,2) NOT NULL,
  digit_gap_mm NUMERIC(5,2) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  UNIQUE(template_id, field_key)
);

-- Seed Askari, HBL, UBL
INSERT INTO check_templates (id, bank_name, branch_name, width_mm, height_mm, printer_offset_x_mm, printer_offset_y_mm)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Askari Bank', 'Gujrat Branch', 178.00, 74.00, 0.00, 0.00),
  ('00000000-0000-0000-0000-000000000002', 'HBL', 'Lahore Branch', 178.00, 74.00, 0.00, 0.00),
  ('00000000-0000-0000-0000-000000000003', 'UBL', 'Karachi Branch', 178.00, 74.00, 0.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- Seed Askari Bank Fields
INSERT INTO check_fields (template_id, field_key, label, x_mm, y_mm, font_size_pt, digit_gap_mm, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'date', 'Date', 124.0, 15.0, 20.0, 2.80, 1),
  ('00000000-0000-0000-0000-000000000001', 'payee', 'Payee Name', 22.0, 24.0, 11.0, NULL, 2),
  ('00000000-0000-0000-0000-000000000001', 'amountWords', 'Amount in Words', 22.0, 32.0, 10.0, NULL, 3),
  ('00000000-0000-0000-0000-000000000001', 'numericAmount', 'Numeric Amount', 133.5, 31.0, 12.0, NULL, 4)
ON CONFLICT (template_id, field_key) DO NOTHING;

-- Seed HBL Fields
INSERT INTO check_fields (template_id, field_key, label, x_mm, y_mm, font_size_pt, digit_gap_mm, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'date', 'Date', 130.0, 12.0, 11.0, 2.80, 1),
  ('00000000-0000-0000-0000-000000000002', 'payee', 'Payee Name', 25.0, 30.0, 11.0, NULL, 2),
  ('00000000-0000-0000-0000-000000000002', 'amountWords', 'Amount in Words', 25.0, 40.0, 10.0, NULL, 3),
  ('00000000-0000-0000-0000-000000000002', 'numericAmount', 'Numeric Amount', 135.0, 40.0, 12.0, NULL, 4)
ON CONFLICT (template_id, field_key) DO NOTHING;

-- Seed UBL Fields
INSERT INTO check_fields (template_id, field_key, label, x_mm, y_mm, font_size_pt, digit_gap_mm, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'date', 'Date', 128.0, 15.0, 11.0, 2.80, 1),
  ('00000000-0000-0000-0000-000000000003', 'payee', 'Payee Name', 24.0, 32.0, 11.0, NULL, 2),
  ('00000000-0000-0000-0000-000000000003', 'amountWords', 'Amount in Words', 24.0, 42.0, 10.0, NULL, 3),
  ('00000000-0000-0000-0000-000000000003', 'numericAmount', 'Numeric Amount', 134.0, 42.0, 12.0, NULL, 4)
ON CONFLICT (template_id, field_key) DO NOTHING;
