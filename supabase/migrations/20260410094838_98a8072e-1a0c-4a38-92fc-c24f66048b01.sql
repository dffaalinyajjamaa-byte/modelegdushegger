
-- Admin codes table
CREATE TABLE public.admin_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check admin codes" ON public.admin_codes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can claim unused admin codes" ON public.admin_codes FOR UPDATE
  USING (used_by IS NULL)
  WITH CHECK (auth.uid() = used_by);

-- Auto quiz books
CREATE TABLE public.auto_quiz_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  pdf_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.auto_quiz_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view books" ON public.auto_quiz_books FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Admins can insert books" ON public.auto_quiz_books FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update books" ON public.auto_quiz_books FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete books" ON public.auto_quiz_books FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto quiz units
CREATE TABLE public.auto_quiz_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.auto_quiz_books(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL,
  unit_title TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.auto_quiz_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view units" ON public.auto_quiz_units FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Admins can insert units" ON public.auto_quiz_units FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update units" ON public.auto_quiz_units FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete units" ON public.auto_quiz_units FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto quiz chunks
CREATE TABLE public.auto_quiz_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.auto_quiz_books(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.auto_quiz_units(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.auto_quiz_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chunks" ON public.auto_quiz_chunks FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Admins can insert chunks" ON public.auto_quiz_chunks FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete chunks" ON public.auto_quiz_chunks FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto quiz results
CREATE TABLE public.auto_quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.auto_quiz_books(id),
  subject TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  passed BOOLEAN DEFAULT false,
  answers JSONB,
  time_taken INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.auto_quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results" ON public.auto_quiz_results FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own results" ON public.auto_quiz_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all results" ON public.auto_quiz_results FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Certificates
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  grade TEXT NOT NULL,
  certificate_url TEXT,
  subjects_completed JSONB,
  issued_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own certificates" ON public.certificates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all certificates" ON public.certificates FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
