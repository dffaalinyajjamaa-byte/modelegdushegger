
-- Storage bucket for national exam PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('national-exam-pdfs', 'national-exam-pdfs', true) ON CONFLICT DO NOTHING;

-- Storage RLS: Admins can upload to auto-quiz book buckets
CREATE POLICY "Admins can upload quiz books"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('books-for-grade-6-auto-quiz', 'books-for-grade-8-auto-quiz')
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Public read quiz books"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('books-for-grade-6-auto-quiz', 'books-for-grade-8-auto-quiz'));

CREATE POLICY "Admins can delete quiz books"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('books-for-grade-6-auto-quiz', 'books-for-grade-8-auto-quiz')
    AND public.has_role(auth.uid(), 'admin')
  );

-- Storage RLS: National exam PDFs
CREATE POLICY "Public read national exam pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'national-exam-pdfs');

CREATE POLICY "Admins can upload national exam pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'national-exam-pdfs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete national exam pdfs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'national-exam-pdfs' AND public.has_role(auth.uid(), 'admin'));

-- Add grade_level column to national_exams
ALTER TABLE public.national_exams ADD COLUMN IF NOT EXISTS grade_level TEXT;

-- Admin write policies for national_exams
CREATE POLICY "Admins can insert national exams"
  ON public.national_exams FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update national exams"
  ON public.national_exams FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete national exams"
  ON public.national_exams FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin write policies for content table
CREATE POLICY "Admins can update content"
  ON public.content FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete content"
  ON public.content FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin UPDATE policy for auto_quiz_results (for quiz editor)
CREATE POLICY "Admins can update results"
  ON public.auto_quiz_results FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin DELETE policy for auto_quiz_results
CREATE POLICY "Admins can delete results"
  ON public.auto_quiz_results FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
