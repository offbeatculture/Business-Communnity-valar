-- Multi-document support per resource
CREATE TABLE resource_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  file_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resource_documents_resource ON resource_documents(resource_id, sort_order);

-- RLS policies
ALTER TABLE resource_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view resource documents"
  ON resource_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage resource documents"
  ON resource_documents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
