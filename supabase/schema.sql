-- 슬러시 현황판 DB 스키마
-- Supabase SQL Editor에서 실행

-- ENUM 타입 정의
CREATE TYPE machine_status AS ENUM ('preparing', 'cooling', 'available', 'sold_out', 'broken');
CREATE TYPE changer_type AS ENUM ('admin', 'employee', 'system');

-- 1) machines: 슬러시 통 (6개 고정 레코드)
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor SMALLINT NOT NULL CHECK (floor IN (2, 3, 4)),
  position TEXT NOT NULL CHECK (position IN ('left', 'right')),
  flavor TEXT NOT NULL DEFAULT '',
  status machine_status NOT NULL DEFAULT 'preparing',
  cooling_end_at TIMESTAMPTZ,
  available_since TIMESTAMPTZ,
  last_cleaned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (floor, position)
);

-- 2) status_logs: 상태 변경 히스토리
CREATE TABLE status_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  previous_status machine_status,
  new_status machine_status NOT NULL,
  changed_by_type changer_type NOT NULL,
  changed_by_name TEXT,
  device_id TEXT,
  ip_address TEXT,
  fingerprint TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) announcements: 공지 팝업
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) email_recipients: 품절 알림 이메일 수신자
CREATE TABLE email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (machine_id, email)
);

-- 5) abuse_records: 어뷰징 기록
CREATE TABLE abuse_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  fingerprint TEXT,
  cookie_id TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) banned_identifiers: 영구 차단 목록
CREATE TABLE banned_identifiers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('device_id', 'ip_address', 'fingerprint', 'cookie_id')),
  identifier_value TEXT NOT NULL,
  banned_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (identifier_type, identifier_value)
);

-- 인덱스
CREATE INDEX idx_abuse_device_time ON abuse_records (device_id, reported_at);
CREATE INDEX idx_abuse_ip_time ON abuse_records (ip_address, reported_at);
CREATE INDEX idx_abuse_fingerprint_time ON abuse_records (fingerprint, reported_at);
CREATE INDEX idx_abuse_cookie_time ON abuse_records (cookie_id, reported_at);
CREATE INDEX idx_banned_lookup ON banned_identifiers (identifier_type, identifier_value);
CREATE INDEX idx_status_logs_machine ON status_logs (machine_id, created_at DESC);
CREATE INDEX idx_status_logs_created ON status_logs (created_at DESC);
CREATE INDEX idx_announcements_active ON announcements (is_active) WHERE is_active = true;
CREATE INDEX idx_machines_cooling ON machines (cooling_end_at)
  WHERE status = 'cooling' AND cooling_end_at IS NOT NULL;
CREATE INDEX idx_email_recipients_machine ON email_recipients (machine_id);

-- RLS 활성화
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_identifiers ENABLE ROW LEVEL SECURITY;

-- RLS 정책: machines/announcements는 anon SELECT 허용 (Realtime 구독용)
CREATE POLICY "machines_select_all" ON machines FOR SELECT USING (true);
CREATE POLICY "announcements_select_all" ON announcements FOR SELECT USING (true);

-- 7) site_settings: 사이트 전역 설정 (단일 행)
CREATE TABLE site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
  report_soldout_enabled BOOLEAN NOT NULL DEFAULT true,
  admin_login_strict BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) admin_allowed_names: 관리자 로그인 강화 시 허용된 이름 목록
CREATE TABLE admin_allowed_names (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- site_settings 초기 데이터
INSERT INTO site_settings (id) VALUES ('global');

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings_select_all" ON site_settings FOR SELECT USING (true);

ALTER TABLE admin_allowed_names ENABLE ROW LEVEL SECURITY;

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE machines;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;
