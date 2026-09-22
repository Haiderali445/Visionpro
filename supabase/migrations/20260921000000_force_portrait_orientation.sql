-- Enforce portrait / vertical printing for every cheque template.
UPDATE check_templates
SET orientation = 'portrait',
    updated_at = NOW()
WHERE orientation IS DISTINCT FROM 'portrait';

ALTER TABLE check_templates
  ALTER COLUMN orientation SET DEFAULT 'portrait';

ALTER TABLE check_templates
  DROP CONSTRAINT IF EXISTS check_templates_orientation_check;

ALTER TABLE check_templates
  ADD CONSTRAINT check_templates_orientation_check
  CHECK (orientation = 'portrait');
