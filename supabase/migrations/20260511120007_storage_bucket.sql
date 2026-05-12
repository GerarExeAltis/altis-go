-- 20260511120007_storage_bucket.sql
-- Bucket publico de fotos de premios + policies via storage.objects.

-- Cria bucket (idempotente)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('fotos_premios', 'fotos_premios', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: qualquer autenticado pode ler
CREATE POLICY "ler_fotos_premios"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'fotos_premios');

-- Policy: admin pode escrever/atualizar/deletar
CREATE POLICY "admin_gerencia_fotos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'fotos_premios' AND public.is_admin())
  WITH CHECK (bucket_id = 'fotos_premios' AND public.is_admin());
