-- V14__document_favorites.sql
-- FR-15 related: user bookmarking / favoriting documents

CREATE TABLE IF NOT EXISTS document_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_favorite UNIQUE (user_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_doc_favorites_user ON document_favorites(user_id);
