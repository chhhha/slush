-- FAQ 테이블 생성
CREATE TABLE faqs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 정렬 인덱스
CREATE INDEX idx_faqs_sort ON faqs (sort_order ASC, id ASC);

-- RLS 활성화
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_select_all" ON faqs FOR SELECT USING (true);

-- Realtime 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE faqs;
