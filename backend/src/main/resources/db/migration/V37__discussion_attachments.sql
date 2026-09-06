-- ============================================================================
-- V37: Discussion Attachments Subsystem (Image & Audio Media)
-- ============================================================================

CREATE TABLE IF NOT EXISTS discussion_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
    media_type VARCHAR(30) NOT NULL, -- 'IMAGE', 'AUDIO', 'DOCUMENT'
    mime_type VARCHAR(100) NOT NULL, -- 'image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mp4'
    original_filename VARCHAR(255) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds INT DEFAULT 0,
    checksum_sha256 VARCHAR(64),
    storage_object_id UUID REFERENCES storage_objects(id) ON DELETE SET NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disc_att_discussion ON discussion_attachments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_disc_att_reply ON discussion_attachments(reply_id);
CREATE INDEX IF NOT EXISTS idx_disc_att_type ON discussion_attachments(media_type);
CREATE INDEX IF NOT EXISTS idx_disc_att_uploader ON discussion_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_disc_att_created ON discussion_attachments(created_at);
