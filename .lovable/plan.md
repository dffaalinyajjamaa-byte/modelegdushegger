

## Phased Implementation Plan

This request contains many features. To avoid breaking the app, I'll implement in focused phases. Here's what's needed:

---

### Phase 1: Fix Bugs + Admin Dashboard Overhaul

**1.1 Fix AI Chat scroll issue (PC + Phone)**
- File: `src/components/AiChat.tsx`
- The chat container at line 164 uses `h-full` but the scroll container likely lacks proper `overflow-y-auto` and flex constraints
- Fix: Ensure the messages area has `flex-1 overflow-y-auto` and the outer container uses `h-[calc(100vh-...)]` or proper flex layout

**1.2 Mobile navbar — liquid glassmorphism**
- File: `src/components/BottomNav.tsx`
- Add stronger glassmorphism: `backdrop-blur-2xl`, `bg-white/10 dark:bg-black/20`, subtle gradient border, and a liquid blob animation behind active item

**1.3 Admin Dashboard — complete overhaul**
- File: `src/components/admin/AdminDashboard.tsx`
- Remove any student-UI patterns, build a professional admin-only control panel
- Add new tabs: **Worksheets**, **Marketplace Admin**, **Badge Verification**
- New admin sections:
  - **Worksheet Upload** — admin uploads PDF worksheets with subject/grade metadata
  - **Badge Verification** — admin can toggle `is_verified` on user profiles (blue badge)
  - **Marketplace Admin** — approve/reject/delete marketplace listings

**Migration needed:**
```sql
-- Worksheets table for admin-uploaded worksheets
CREATE TABLE public.worksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;
-- RLS: authenticated SELECT, admin INSERT/UPDATE/DELETE

-- Storage bucket for worksheet PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('worksheets', 'worksheets', true) ON CONFLICT DO NOTHING;
-- Storage RLS for admin uploads
```

---

### Phase 2: Auto Quiz Simplification

**Remove unit extraction** — When admin uploads a book, skip the unit/chunk extraction step entirely. Instead:
- Store the book record in `auto_quiz_books` with `processing_status = 'ready'` immediately (no edge function call needed on upload)
- When a student selects a book and clicks "Start Quiz", the frontend sends the book's PDF URL + question count directly to the `generate-auto-quiz` edge function
- The edge function downloads the PDF, sends it to Gemini with inline PDF data, and gets quiz questions back directly — no chunks/units involved

**Files to modify:**
- `src/components/admin/AdminBookManager.tsx` — remove `process-quiz-book` invocation on upload, set status to `ready`
- `src/components/auto-quiz/AutoQuizSetup.tsx` — remove unit selection UI, just show books and question count
- `supabase/functions/generate-auto-quiz/index.ts` — rewrite to accept `pdfUrl` instead of reading chunks, send PDF directly to Gemini

---

### Phase 3: Marketplace Feature

**Database tables (migration):**
```sql
CREATE TABLE public.marketplace_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'books', 'worksheets', 'rentals', 'digital'
  type TEXT NOT NULL DEFAULT 'sell', -- 'sell' or 'rent'
  price NUMERIC NOT NULL DEFAULT 0,
  condition TEXT, -- 'new', 'like-new', 'good', 'fair'
  images TEXT[], -- array of storage URLs
  file_url TEXT, -- for digital/worksheet PDFs
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  rent_duration_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES marketplace_products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: Users can SELECT approved products, INSERT own products, admin can UPDATE status.

**Storage bucket:** `marketplace-images` (public)

**New files:**
| File | Purpose |
|------|---------|
| `src/components/marketplace/Marketplace.tsx` | Main container with tabs: Home, Upload, My Listings |
| `src/components/marketplace/MarketplaceHome.tsx` | Browse listings: Recently Added, Categories, search |
| `src/components/marketplace/ProductDetail.tsx` | Image slider, seller info, contact seller, distance |
| `src/components/marketplace/ProductUpload.tsx` | Multi-step upload: info → media → location → submit |
| `src/components/marketplace/NearbyMap.tsx` | Leaflet map (from uploaded zip) shown on button click, markers for products |
| `src/components/admin/AdminMarketplace.tsx` | Approve/reject/delete listings |

**Map approach:** Use Leaflet (open-source) from the uploaded zip instead of Google Maps. Map only appears when user clicks "Nearby" button — not full-screen by default.

**Geo features:**
- Browser Geolocation API for user position
- Haversine distance calculation in a Postgres function for nearby queries
- Reverse geocoding via free Nominatim API

**Dashboard integration:**
- Add `'marketplace'` to `ActiveView` type
- Add Marketplace quick-access button (with NEW badge) next to Auto Quiz
- Add to BottomNav as 6th item or replace one

---

### Phase 4: Admin Badge Verification

- New component: `src/components/admin/AdminBadgeVerification.tsx`
- Shows list of users with toggle to set `profiles.is_verified = true/false`
- Migration: Add admin UPDATE policy on profiles if not already present (currently users can only update own profile)

```sql
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
```

---

### Implementation Order

1. **Migration** — All new tables (worksheets, marketplace_products, marketplace_reviews) + RLS + storage buckets + admin profile update policy
2. **Fix AI Chat scroll** — Quick CSS fix
3. **Fix BottomNav glassmorphism** — CSS enhancement + add Marketplace tab
4. **Auto Quiz simplification** — Remove units, direct PDF-to-Gemini flow
5. **Admin Dashboard overhaul** — Add worksheet upload, badge verification, marketplace admin tabs
6. **Marketplace UI** — All 6 new components
7. **Leaflet map integration** — Extract uploaded zip, integrate into NearbyMap component

### Files Summary

| Modified | Created |
|----------|---------|
| `AdminDashboard.tsx` | `marketplace/Marketplace.tsx` |
| `AdminBookManager.tsx` | `marketplace/MarketplaceHome.tsx` |
| `AutoQuizSetup.tsx` | `marketplace/ProductDetail.tsx` |
| `AiChat.tsx` | `marketplace/ProductUpload.tsx` |
| `BottomNav.tsx` | `marketplace/NearbyMap.tsx` |
| `Dashboard.tsx` | `admin/AdminMarketplace.tsx` |
| `generate-auto-quiz/index.ts` | `admin/AdminBadgeVerification.tsx` |
| | `admin/AdminWorksheets.tsx` |

