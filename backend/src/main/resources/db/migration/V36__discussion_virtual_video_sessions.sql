-- ============================================================================
-- V36: Discussion Virtual Video Sessions Subsystem
-- ============================================================================

CREATE TABLE IF NOT EXISTS video_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES discussion_topics(id) ON DELETE CASCADE,
    host_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    host_username VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, ACTIVE, ENDED, CANCELLED
    meeting_provider VARCHAR(50) NOT NULL DEFAULT 'JITSI',
    meeting_identifier VARCHAR(500) NOT NULL,
    meeting_url VARCHAR(500),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_sessions_discussion ON video_sessions(discussion_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_host ON video_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_status ON video_sessions(status);
CREATE INDEX IF NOT EXISTS idx_video_sessions_sched_start ON video_sessions(scheduled_start);

CREATE TABLE IF NOT EXISTS video_session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_session_id UUID NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'PARTICIPANT', -- HOST, MODERATOR, PARTICIPANT
    status VARCHAR(30) NOT NULL DEFAULT 'INVITED', -- INVITED, JOINED, LEFT, DECLINED
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vsp_session ON video_session_participants(video_session_id);
CREATE INDEX IF NOT EXISTS idx_vsp_user ON video_session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_vsp_username ON video_session_participants(username);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vsp_session_user ON video_session_participants(video_session_id, username);
