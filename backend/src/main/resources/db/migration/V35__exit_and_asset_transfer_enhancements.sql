-- V35: Employee Exit and Knowledge/Asset Transfer Enhancements

-- 1. Extend knowledge_transfer_cases with historical snapshots and review flags
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS employee_snapshot_name VARCHAR(150);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS employee_snapshot_title VARCHAR(100);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS employee_snapshot_dept VARCHAR(100);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS employee_snapshot_number VARCHAR(50);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS manager_snapshot_name VARCHAR(150);
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS exit_date DATE;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS manager_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS hr_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS hr_approved_at TIMESTAMPTZ;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS successor_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS successor_accepted_at TIMESTAMPTZ;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS successor_notes TEXT;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS access_revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE knowledge_transfer_cases ADD COLUMN IF NOT EXISTS access_revoked_at TIMESTAMPTZ;

-- 2. Structured Knowledge Transfer Inventory Items
CREATE TABLE IF NOT EXISTS knowledge_transfer_inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- RESPONSIBILITY, BUSINESS_PROCESS, SYSTEM_TOOL, CRITICAL_KNOWLEDGE, TROUBLESHOOTING, IMPORTANT_CONTACT, LESSON_LEARNED
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    criticality VARCHAR(30) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, TRANSFERRED, ACCEPTED
    notes TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kt_inventory_case ON knowledge_transfer_inventory_items(case_id);
CREATE INDEX IF NOT EXISTS idx_kt_inventory_cat ON knowledge_transfer_inventory_items(category);

-- 3. Document Library Handover Attachments
CREATE TABLE IF NOT EXISTS knowledge_transfer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    transfer_action VARCHAR(50) NOT NULL DEFAULT 'REFERENCE', -- REFERENCE, HANDOVER, REASSIGN_AUTHOR
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, TRANSFERRED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_kt_case_doc UNIQUE (case_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_kt_docs_case ON knowledge_transfer_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_kt_docs_doc ON knowledge_transfer_documents(document_id);

-- 4. Organizational Asset Handover Records
CREATE TABLE IF NOT EXISTS knowledge_transfer_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL, -- LAPTOP, DESKTOP, MOBILE_DEVICE, STORAGE_MEDIA, SECURITY_TOKEN, ACCESS_CARD, OTHER
    asset_identifier VARCHAR(100) NOT NULL, -- Serial Number, Asset Tag, Barcode
    description VARCHAR(255) NOT NULL,
    condition_status VARCHAR(50) DEFAULT 'GOOD', -- EXCELLENT, GOOD, FAIR, DAMAGED
    current_holder_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    handover_date DATE,
    return_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, RETURNED_TO_IT, HANDED_TO_SUCCESSOR, RETAINED
    acceptance_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kt_assets_case ON knowledge_transfer_assets(case_id);

-- 5. System Access Review & Revocation Records
CREATE TABLE IF NOT EXISTS knowledge_transfer_access_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES knowledge_transfer_cases(id) ON DELETE CASCADE,
    system_or_resource VARCHAR(150) NOT NULL, -- System/Platform Name
    current_access_level VARCHAR(100) NOT NULL,
    revoke_required BOOLEAN NOT NULL DEFAULT TRUE,
    revocation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, REVOKED, NOT_APPLICABLE
    successor_access_required VARCHAR(100),
    provisioning_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROVISIONED, REJECTED, NOT_REQUIRED
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kt_access_case ON knowledge_transfer_access_reviews(case_id);
