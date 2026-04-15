

## Fix AI Chat Scroll + Admin Dashboard Overhaul + Marketplace Enhancement

### Part 1: Fix AI Chat Scroll (Mobile + Desktop)

**Problem:** The chat container uses `h-[calc(100vh-8rem)]` but on mobile, the BottomNav (h-16 + margins) eats into viewport. The scroll area works but the container height calculation is wrong.

**Fix in `AiChat.tsx`:**
- Change outer div to `h-[calc(100dvh-12rem)] md:h-[calc(100vh-6rem)]` using `100dvh` for mobile
- Ensure `min-h-0` is on the flex container so `flex-1 overflow-y-auto` works correctly
- Add `pb-4` to the scrollable messages area so last message isn't hidden behind input

### Part 2: Admin Gets Dedicated Dashboard (No Student UI)

**Problem:** When an admin logs in, they see the same student dashboard with all cards (AI Teacher, Books, Videos, etc.). Admin should see ONLY the admin control panel.

**Fix in `Dashboard.tsx`:**
- When `isAdminUser === true`, skip `renderDashboard()` entirely and auto-redirect to `activeView = 'admin'`
- In the `renderActiveView` switch, when admin is on `'dashboard'`, render AdminDashboard directly instead of the student grid
- Hide BottomNav for admin users (they don't need student navigation)

### Part 3: Expand Admin Dashboard to 10+ Features

Current tabs: Overview, Exams, Quiz Books, Worksheets, Content, Market, Badges, Results, Users, Analytics (10 tabs already).

**Add these new capabilities within existing tabs:**

1. **Quiz Editor tab** — Add ability to CREATE new quizzes (not just view results). Admin can write questions with 4 options + correct answer, assign to subject/grade.
2. **Quiz Editor tab** — Add ability to EDIT existing quiz answers from `auto_quiz_results`
3. **Worksheets tab** — Already has upload; ensure read/list/delete works
4. **Content tab** — Add video lesson upload (YouTube URL + metadata) — already exists but verify it works
5. **Overview** — Add recent activity feed, system health metrics
6. **Users** — Add ability to ban/suspend users
7. **Exams** — Add inline exam answer editing
8. **Marketplace** — Product approval workflow already exists
9. **New: Reports tab** — View reported messages and handle moderation
10. **New: Settings tab** — Admin platform settings (announcement banner, maintenance mode)

**Migration needed:**
```sql
-- Admin-created quizzes table (manual quiz creation)
CREATE TABLE public.admin_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_quizzes ENABLE ROW LEVEL SECURITY;
-- Authenticated SELECT, admin INSERT/UPDATE/DELETE
```

**New admin components:**
- Modify `AdminQuizEditor.tsx` — Add quiz creation form + edit existing quiz answers
- Modify `AdminDashboard.tsx` — Add 2 new tabs (Reports, Settings), auto-show for admin users

### Part 4: Marketplace Full Feature Implementation

Currently the marketplace has: browse, upload, detail view. Missing: nearby map, seller chat, ratings UI, glassmorphism styling.

**Enhancements:**

1. **Glassmorphism styling** — Apply `backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/15` to all marketplace cards and containers
2. **Nearby button + map** — Add a "Nearby" toggle button in MarketplaceHome that shows a Leaflet map with product markers (use `leaflet` npm package, no Google Maps needed)
3. **Seller chat integration** — "Contact Seller" button in ProductDetail creates a chat in existing `chats` table and navigates to messenger
4. **Rating system** — After viewing a product, show seller rating from `marketplace_reviews`. Add review submission form
5. **Distance display** — Use browser geolocation + haversine_distance function to show "X km away" on each product card
6. **Skeleton loaders** — Add loading skeletons while products load
7. **Rent flow** — Duration selector (7/30 days) with return date calculation

**Files to modify:**
| File | Changes |
|------|---------|
| `MarketplaceHome.tsx` | Glassmorphism cards, nearby button, distance display, skeletons |
| `ProductDetail.tsx` | Glassmorphism, seller chat button, rating display, rent duration |
| `ProductUpload.tsx` | Glassmorphism styling |
| `Marketplace.tsx` | Add "My Listings" tab |

**New file:**
| `src/components/marketplace/NearbyMap.tsx` | Leaflet map with product markers, shown on button click |

### Part 5: BottomNav — Hide for Admin

When admin is logged in, hide BottomNav completely since they use the admin panel tabs.

### Implementation Order

1. Migration — `admin_quizzes` table + RLS
2. Fix `AiChat.tsx` scroll
3. Update `Dashboard.tsx` — admin auto-redirects to admin panel, hide BottomNav for admin
4. Expand `AdminDashboard.tsx` — quiz creation, reports tab, settings tab
5. Update `AdminQuizEditor.tsx` — quiz CRUD
6. Marketplace glassmorphism + features (all marketplace files)
7. Install leaflet + create NearbyMap component

### Files Summary

| Modified | Created |
|----------|---------|
| `AiChat.tsx` | `marketplace/NearbyMap.tsx` |
| `Dashboard.tsx` | |
| `AdminDashboard.tsx` | |
| `AdminQuizEditor.tsx` | |
| `MarketplaceHome.tsx` | |
| `ProductDetail.tsx` | |
| `ProductUpload.tsx` | |
| `Marketplace.tsx` | |
| `BottomNav.tsx` | |

