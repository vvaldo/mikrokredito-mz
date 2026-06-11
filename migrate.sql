-- ================================================================
-- SIGEM-MICROCREDITO — Migration v14
-- Run: psql -U postgres -d microcredito -f migrate.sql
-- Or:  cat migrate.sql | psql -U postgres -d microcredito
-- ================================================================

-- Add new client fields
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS doc_type          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS doc_issue_date    DATE,
  ADD COLUMN IF NOT EXISTS doc_expiry_date   DATE,
  ADD COLUMN IF NOT EXISTS birth_place       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS employment_type   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS employer_name     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS employer_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS dependents        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guarantors        JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS photo_url         TEXT;

-- Add notification read tracking
ALTER TABLE notification_logs
  ADD COLUMN IF NOT EXISTS read_at         TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS read_by_user_id UUID;

-- Verify
SELECT 'clients:' AS tbl, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients'
  AND column_name IN (
    'doc_type','doc_issue_date','doc_expiry_date','birth_place',
    'employment_type','employer_name','employer_location',
    'dependents','guarantors','photo_url'
  )
UNION ALL
SELECT 'notification_logs:' AS tbl, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notification_logs'
  AND column_name IN ('read_at','read_by_user_id')
ORDER BY tbl, column_name;
