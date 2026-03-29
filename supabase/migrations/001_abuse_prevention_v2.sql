-- 품절 신고 어뷰징 방지 v2 마이그레이션
-- 다중 식별자 + 쿨다운 + 영구 차단(shadow ban) 시스템

-- 1) abuse_records에 식별자 컬럼 추가
ALTER TABLE abuse_records ADD COLUMN fingerprint TEXT;
ALTER TABLE abuse_records ADD COLUMN cookie_id TEXT;

-- 2) status_logs에 fingerprint 추가 (로그에서 식별자 확인용)
ALTER TABLE status_logs ADD COLUMN fingerprint TEXT;

-- 3) banned_identifiers 테이블 신규 생성
CREATE TABLE banned_identifiers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('device_id', 'ip_address', 'fingerprint', 'cookie_id')),
  identifier_value TEXT NOT NULL,
  banned_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (identifier_type, identifier_value)
);

-- 4) 인덱스
CREATE INDEX idx_banned_lookup ON banned_identifiers (identifier_type, identifier_value);
CREATE INDEX idx_abuse_fingerprint_time ON abuse_records (fingerprint, reported_at);
CREATE INDEX idx_abuse_cookie_time ON abuse_records (cookie_id, reported_at);

-- 5) RLS 활성화
ALTER TABLE banned_identifiers ENABLE ROW LEVEL SECURITY;
