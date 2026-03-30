-- 관리자 로그인 강화 기능
-- site_settings에 admin_login_strict, admin_token_epoch 컬럼 추가
ALTER TABLE site_settings ADD COLUMN admin_login_strict BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE site_settings ADD COLUMN admin_token_epoch TIMESTAMPTZ;

-- 허용된 관리자 이름 목록
CREATE TABLE admin_allowed_names (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE admin_allowed_names ENABLE ROW LEVEL SECURITY;
