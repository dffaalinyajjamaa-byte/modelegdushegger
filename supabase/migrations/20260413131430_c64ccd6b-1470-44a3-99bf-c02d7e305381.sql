
-- Worksheets table
CREATE TABLE public.worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view worksheets" ON public.worksheets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert worksheets" ON public.worksheets
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update worksheets" ON public.worksheets
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete worksheets" ON public.worksheets
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Marketplace products table
CREATE TABLE public.marketplace_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sell',
  price NUMERIC NOT NULL DEFAULT 0,
  condition TEXT,
  images TEXT[],
  file_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  status TEXT DEFAULT 'pending',
  rent_duration_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approved or own products" ON public.marketplace_products
  FOR SELECT TO authenticated USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own products" ON public.marketplace_products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.marketplace_products
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own products" ON public.marketplace_products
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Marketplace reviews table
CREATE TABLE public.marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.marketplace_reviews
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers can insert reviews" ON public.marketplace_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

-- Validation trigger for rating instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_review_rating_trigger
  BEFORE INSERT OR UPDATE ON public.marketplace_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('worksheets', 'worksheets', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-images', 'marketplace-images', true) ON CONFLICT DO NOTHING;

-- Storage RLS for worksheets (admin only upload)
CREATE POLICY "Public read worksheets" ON storage.objects
  FOR SELECT USING (bucket_id = 'worksheets');
CREATE POLICY "Admins can upload worksheets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'worksheets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete worksheets" ON storage.objects
  FOR DELETE USING (bucket_id = 'worksheets' AND public.has_role(auth.uid(), 'admin'));

-- Storage RLS for marketplace images (users upload to own folder)
CREATE POLICY "Public read marketplace images" ON storage.objects
  FOR SELECT USING (bucket_id = 'marketplace-images');
CREATE POLICY "Users can upload marketplace images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'marketplace-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own marketplace images" ON storage.objects
  FOR DELETE USING (bucket_id = 'marketplace-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin can update any profile (for badge verification)
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Haversine distance function for nearby queries
CREATE OR REPLACE FUNCTION public.haversine_distance(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  r DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlng DOUBLE PRECISION;
  a DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  RETURN r * 2 * asin(sqrt(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
