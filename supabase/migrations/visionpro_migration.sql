-- ============================================================
-- CHECK TEMPLATE + CHECK FIELD MIGRATION
-- Supabase / PostgreSQL
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE TABLE: public.check_templates
-- ============================================================

CREATE TABLE IF NOT EXISTS public.check_templates (
    id UUID PRIMARY KEY,
    bank_name TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    width_mm NUMERIC NOT NULL,
    height_mm NUMERIC NOT NULL,
    orientation TEXT NOT NULL,
    inverted BOOLEAN NOT NULL DEFAULT FALSE,
    payee_account_only BOOLEAN NOT NULL DEFAULT FALSE,
    stamp_config JSONB,
    printer_offset_x_mm NUMERIC NOT NULL DEFAULT 0,
    printer_offset_y_mm NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. CREATE TABLE: public.check_fields
-- ============================================================

CREATE TABLE IF NOT EXISTS public.check_fields (
    id UUID PRIMARY KEY,
    template_id UUID NOT NULL,
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    x_mm NUMERIC NOT NULL,
    y_mm NUMERIC NOT NULL,
    font_size_pt NUMERIC NOT NULL,
    digit_gap_mm NUMERIC,
    sort_order INTEGER NOT NULL,

    CONSTRAINT check_fields_template_id_fkey
        FOREIGN KEY (template_id)
        REFERENCES public.check_templates(id)
        ON DELETE CASCADE
);


-- ============================================================
-- 3. OPTIONAL INDEX
--    Useful because fields are frequently fetched by template_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_check_fields_template_id
    ON public.check_fields(template_id);


-- ============================================================
-- 4. INSERT CHECK TEMPLATES
-- ============================================================

INSERT INTO public.check_templates (
    id,
    bank_name,
    branch_name,
    width_mm,
    height_mm,
    orientation,
    inverted,
    payee_account_only,
    stamp_config,
    printer_offset_x_mm,
    printer_offset_y_mm,
    created_at,
    updated_at
)
VALUES

//adjustment duplicate entries

SELECT template_id, field_key, COUNT(*)
FROM public.check_fields
GROUP BY template_id, field_key
HAVING COUNT(*) > 1;[1:15 PM]BEGIN;

ALTER TABLE public.check_fields
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX check_fields_template_id_field_key_uidx
  ON public.check_fields (template_id, field_key);

COMMIT;

(
    '00000000-0000-0000-0000-000000000001',
    'Askari Bank',
    'Gujrat Branch',
    178.00,
    74.00,
    'portrait',
    TRUE,
    TRUE,
    '{"x": 9, "y": 7, "text": "PAYEE''S ACCOUNT ONLY", "angle": -28, "width": 30}'::jsonb,
    0.00,
    0.00,
    '2026-09-16 06:39:23.237473+00',
    '2026-10-06 09:48:27.446+00'
),

(
    '00000000-0000-0000-0000-000000000002',
    'HBL',
    'Lahore Branch',
    178.00,
    74.00,
    'landscape',
    FALSE,
    FALSE,
    '{"x": 0, "y": 7, "text": "PAYEE''S ACCOUNT ONLY", "angle": -24, "width": 30}'::jsonb,
    0.00,
    0.00,
    '2026-09-16 06:39:23.237473+00',
    '2026-09-16 06:39:23.237473+00'
),

(
    '00000000-0000-0000-0000-000000000003',
    'UBL',
    'Karachi Branch',
    178.00,
    74.00,
    'landscape',
    FALSE,
    FALSE,
    '{"x": 0, "y": 7, "text": "PAYEE''S ACCOUNT ONLY", "angle": -24, "width": 30}'::jsonb,
    0.00,
    0.00,
    '2026-09-16 06:39:23.237473+00',
    '2026-09-16 06:39:23.237473+00'
),

(
    '1942ddbe-4b4f-4d7b-97a0-dd53996800e4',
    'meezan',
    'Main Branch',
    178.00,
    74.00,
    'landscape',
    FALSE,
    TRUE,
    '{"x": 0, "y": 7, "text": "PAYEE''S ACCOUNT ONLY", "angle": -24, "width": 30}'::jsonb,
    0.00,
    0.00,
    '2026-09-16 06:42:17.722623+00',
    '2026-09-16 06:42:19.559+00'
)

ON CONFLICT (id) DO UPDATE SET
    bank_name = EXCLUDED.bank_name,
    branch_name = EXCLUDED.branch_name,
    width_mm = EXCLUDED.width_mm,
    height_mm = EXCLUDED.height_mm,
    orientation = EXCLUDED.orientation,
    inverted = EXCLUDED.inverted,
    payee_account_only = EXCLUDED.payee_account_only,
    stamp_config = EXCLUDED.stamp_config,
    printer_offset_x_mm = EXCLUDED.printer_offset_x_mm,
    printer_offset_y_mm = EXCLUDED.printer_offset_y_mm,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;


-- ============================================================
-- 5. INSERT CHECK FIELDS
-- ============================================================

INSERT INTO public.check_fields (
    id,
    template_id,
    field_key,
    label,
    x_mm,
    y_mm,
    font_size_pt,
    digit_gap_mm,
    sort_order
)
VALUES

(
    '07651ce0-1f85-49b3-a61e-aee070aba7f8',
    '00000000-0000-0000-0000-000000000002',
    'numericAmount',
    'Numeric Amount',
    135.00,
    40.00,
    12.00,
    NULL,
    4
),

(
    '09c824a6-c235-4199-82bd-5084fd3ea7be',
    '00000000-0000-0000-0000-000000000003',
    'amountWords',
    'Amount in Words',
    24.00,
    42.00,
    10.00,
    NULL,
    3
),

(
    '29cc4c6c-16ba-4ee1-b7a4-6958c61e5867',
    '00000000-0000-0000-0000-000000000002',
    'date',
    'Date',
    130.00,
    12.00,
    11.00,
    2.80,
    1
),

(
    '38821940-1f4e-49c5-9d1a-fc9a62cb9911',
    '00000000-0000-0000-0000-000000000003',
    'numericAmount',
    'Numeric Amount',
    134.00,
    42.00,
    12.00,
    NULL,
    4
),

(
    '5e7d7fa2-5d93-4698-8aae-fe64cdb69786',
    '00000000-0000-0000-0000-000000000001',
    'payee',
    'Payee Name',
    22.00,
    24.50,
    11.00,
    NULL,
    2
),

(
    '7a73ffff-b58c-4de9-b0cb-c70ba1ae04c0',
    '00000000-0000-0000-0000-000000000002',
    'amountWords',
    'Amount in Words',
    25.00,
    40.00,
    10.00,
    NULL,
    3
),

(
    '90b36be8-7deb-40b4-a0c4-894bf6b6b0bc',
    '00000000-0000-0000-0000-000000000002',
    'payee',
    'Payee Name',
    25.00,
    30.00,
    11.00,
    NULL,
    2
),

(
    '94144307-331c-467d-9bde-9e4dbadf33e0',
    '1942ddbe-4b4f-4d7b-97a0-dd53996800e4',
    'numericAmount',
    'Numeric Amount',
    133.50,
    31.00,
    12.00,
    NULL,
    4
),

(
    'a2266ae2-5e8b-4a77-abe1-0cf6040b4a61',
    '00000000-0000-0000-0000-000000000003',
    'payee',
    'Payee Name',
    24.00,
    32.00,
    11.00,
    NULL,
    2
),

(
    'bced56b1-55bc-4f1c-bb4a-a1f43406abff',
    '00000000-0000-0000-0000-000000000001',
    'numericAmount',
    'Numeric Amount',
    133.50,
    31.00,
    12.00,
    NULL,
    4
),

(
    'cdf3a112-045d-4449-84ca-0a15f659a20a',
    '1942ddbe-4b4f-4d7b-97a0-dd53996800e4',
    'payee',
    'Payee Name',
    22.00,
    24.00,
    11.00,
    NULL,
    2
),

(
    'cf1b544f-f276-46cb-aa86-887e0dcb124f',
    '00000000-0000-0000-0000-000000000001',
    'date',
    'Date',
    125.00,
    15.00,
    12.00,
    2.65,
    1
),

(
    'd7e5e5db-aa7a-4534-bccf-bd0adcdcc370',
    '1942ddbe-4b4f-4d7b-97a0-dd53996800e4',
    'date',
    'Date',
    178.00,
    15.00,
    20.00,
    2.80,
    1
),

(
    'e876fab3-a34c-4122-a85c-f6d356232026',
    '1942ddbe-4b4f-4d7b-97a0-dd53996800e4',
    'amountWords',
    'Amount in Words',
    22.00,
    32.00,
    10.00,
    NULL,
    3
),

(
    'ef000f0f-5ce7-4ce1-bf45-bfa151bca8e4',
    '00000000-0000-0000-0000-000000000001',
    'amountWords',
    'Amount in Words',
    21.00,
    32.00,
    10.00,
    NULL,
    3
),

(
    'fed79618-be77-4d84-a783-fa9a53fc32d8',
    '00000000-0000-0000-0000-000000000003',
    'date',
    'Date',
    128.00,
    15.00,
    11.00,
    2.80,
    1
)

ON CONFLICT (id) DO UPDATE SET
    template_id = EXCLUDED.template_id,
    field_key = EXCLUDED.field_key,
    label = EXCLUDED.label,
    x_mm = EXCLUDED.x_mm,
    y_mm = EXCLUDED.y_mm,
    font_size_pt = EXCLUDED.font_size_pt,
    digit_gap_mm = EXCLUDED.digit_gap_mm,
    sort_order = EXCLUDED.sort_order;


-- ============================================================
-- 6. VERIFY MIGRATION
-- ============================================================

SELECT
    'check_templates' AS table_name,
    COUNT(*) AS row_count
FROM public.check_templates

UNION ALL

SELECT
    'check_fields' AS table_name,
    COUNT(*) AS row_count
FROM public.check_fields;


-- ============================================================
-- 7. VERIFY RELATIONSHIP
-- ============================================================

SELECT
    t.id AS template_id,
    t.bank_name,
    t.branch_name,
    COUNT(f.id) AS field_count
FROM public.check_templates t
LEFT JOIN public.check_fields f
    ON f.template_id = t.id
GROUP BY
    t.id,
    t.bank_name,
    t.branch_name
ORDER BY t.bank_name;


COMMIT;