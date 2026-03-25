-- ============================================
-- Licona Realty Platform - Storage Buckets
-- ============================================
-- All buckets are PRIVATE - no public URLs for documents containing PII.
-- Access controlled by RLS policies on storage.objects.
-- ============================================

-- Documents bucket: contracts, disclosures, inspection reports, etc.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Contact imports bucket: temporary storage for CSV/Excel uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false);

-- Canva assets bucket: branded content and templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('canva-assets', 'canva-assets', false);

-- Social media assets: images and videos for social posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', false);

-- Profile assets: agent profile photos, logos (can be public for SEO pages)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true);

-- ============================================
-- Storage RLS Policies
-- ============================================

-- Documents: only authenticated users can access their own files
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Imports: only authenticated users can access their own imports
CREATE POLICY "Users can upload imports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'imports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own imports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'imports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own imports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'imports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Canva assets: authenticated users only
CREATE POLICY "Users can upload canva assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'canva-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own canva assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'canva-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Social media: authenticated users only
CREATE POLICY "Users can upload social media assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own social media assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Profile assets: public read, authenticated write
CREATE POLICY "Anyone can view profile assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'brand-assets');

CREATE POLICY "Authenticated users can upload profile assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brand-assets');

-- File size limits enforced at the application layer (25MB max)
-- File type validation enforced at the application layer (magic bytes)
