
# Liquid Glass: Polish, Consistency & Full Reskin

Four coordinated workstreams to finish the Liquid Glass rollout across the app.

---

## 1. Accessibility Settings — Reduced Motion / Transparency Toggle

**Goal:** Let users override the OS `prefers-reduced-motion` / `prefers-reduced-transparency` defaults and persist the choice.

- New table `user_preferences` (`user_id` PK, `reduce_motion` bool, `reduce_transparency` bool, `updated_at`) with RLS (owner-only select/insert/update).
- New hook `useAppearancePreferences()` — loads from `user_preferences` on auth, falls back to `safeStorage` for guests, exposes `{ reduceMotion, reduceTransparency, setX }`.
- New `AppearanceProvider` mounted in `App.tsx`. It toggles two classes on `<html>`: `lg-reduce-motion`, `lg-reduce-transparency`.
- Extend `src/index.css` so existing `.lg-glass`, `.lg-press`, animations check both the media queries **and** these classes (frosted-matte fallback + disabled springs).
- Add an "Appearance" section in `Settings.tsx` with two `Switch` rows + helper text. Save on toggle (debounced 400 ms) with toast feedback.

---

## 2. Shared Icon Component

**Goal:** One source of truth for emoji-to-Lucide mappings; ban inline emoji.

- New `src/components/ui/app-icon.tsx` exporting `<AppIcon name="trophy" size={20} />`. Internally a typed registry mapping semantic names → Lucide components.
- New `src/lib/icon-map.ts` with grouped maps:
  - `reactions`: like → ThumbsUp, love → Heart, fire → Flame, clap → Hand, laugh → Smile, sad → Frown.
  - `relaxCategories`: history → Landmark, war → Swords, drama → Theater, music → Music, science → FlaskConical, etc.
  - `subjects`, `status` (success/warning/error/info), `actions` (edit/delete/share/upload/download), `files`.
- Refactor `Messenger.tsx` reactions, `RelaxTime.tsx` category chips, and any leftover emoji literals (audit via `rg "[\\u{1F300}-\\u{1FAFF}]"`).
- ESLint custom rule (or simple `rg` check noted in README) discouraging raw emoji in JSX.

---

## 3. Liquid Glass Reskin — Remaining Screens

Apply the existing `.lg-glass`, `.lg-island`, `.lg-press`, `.lg-reflect` tokens plus floating-island headers and glass list cells. No structural UX rewrites — visual layer + spacing.

**Screens to reskin (grouped):**

- **Auth shell:** `AuthForm.tsx`, `pages/ResetPassword.tsx` — glass card on blurred gradient backdrop, iOS-blue primary CTA, segmented Student/Teacher control as glass pill.
- **Learning content viewers:** `AiChat.tsx`, `BookAIChat.tsx`, `PDFViewer.tsx`, `VideoViewer.tsx`, `DigitalBooksLibrary.tsx`, `VideoLessonsLibrary.tsx` — floating-island top bar (back + title + actions), glass list cells for library rows, glass composer bar for chat.
- **Quiz & Worksheets:** `QuizFeature.tsx`, `QuizResults.tsx`, `Worksheets.tsx`, `auto-quiz/*` — glass question card, floating timer island, glass option pills with iOS-blue selected state, glass result summary.
- **Marketplace:** `marketplace/Marketplace.tsx`, `MarketplaceHome.tsx`, `ProductDetail.tsx`, `ProductUpload.tsx`, `NearbyMap.tsx` — glass product cells, floating filter island, glass detail sheet.
- **Admin:** `admin/AdminDashboard.tsx` and all sub-managers (`AdminQuizList`, `AdminQuizEditor`, `AdminBookManager`, `AdminWorksheetManager`, `AdminContentManager`, `AdminUserManager`, `AdminMarketplace`, `AdminNationalExams`, `AdminBadgeVerification`, `AdminResults`) — convert dense tables to responsive glass card lists on mobile (md: keeps table), floating action bar for bulk ops.
- **Misc:** `NationalExams.tsx`, `Channels.tsx`, `Stories.tsx`, `Competition.tsx`, `ScienceExperiments.tsx`, `SmartPlanner*`, `StudyByMusic*`, `TeacherStudios.tsx`, `LiveTeacherHome.tsx` — header → island, cards → glass.

**Conventions for every screen:**
- Top: `lg-island sticky top-3 mx-3` header with back button (glass-button) + title + right-action slot.
- Body: `space-y-3 px-3 pb-28`, items use `lg-glass rounded-2xl p-4` with `lg-press` on tappables.
- Touch targets ≥ 44×44 pt; primary CTA uses `--ios-blue`.
- Respect Section 1 settings — all blur/scale wrapped to honor `.lg-reduce-*` classes.

---

## 4. Liquid Glass Skeleton Loaders

**Goal:** Branded loading states matching the glass aesthetic.

- New `src/components/ui/skeleton-glass.tsx` — base `<SkeletonGlass />` with shimmering `lg-glass` background and animated light sweep (respects reduced-motion).
- Compound exports:
  - `SkeletonChatBubble` — used in `AiChat`, `BookAIChat`, `AITeacher` while awaiting response or translation.
  - `SkeletonViewer` — full-bleed glass shimmer for `VideoViewer` (16:9) and `PDFViewer` (A4 ratio).
  - `SkeletonChartCard` — used in `ProgressCharts`, `OverallProgressCards`, `SubjectProgressCards` during data fetch.
  - `SkeletonListCell` — for library/admin lists.
- Wire into existing loading branches (replace current `<Loader2>` spinners and bare `Skeleton` usages in those components only).

---

## Technical details

**Files created**
- `supabase/migrations/<ts>_user_preferences.sql`
- `src/hooks/use-appearance-preferences.ts`
- `src/components/AppearanceProvider.tsx`
- `src/components/ui/app-icon.tsx`
- `src/lib/icon-map.ts`
- `src/components/ui/skeleton-glass.tsx`

**Files edited (high level)**
- `src/App.tsx` (mount `AppearanceProvider`)
- `src/index.css` (`.lg-reduce-motion`, `.lg-reduce-transparency` selectors)
- `src/components/Settings.tsx` (Appearance section)
- `src/components/Messenger.tsx`, `RelaxTime.tsx` (use `AppIcon`)
- All screens listed in Section 3 (token application; no logic changes)
- Loading branches in `AiChat.tsx`, `BookAIChat.tsx`, `AITeacher.tsx`, `VideoViewer.tsx`, `PDFViewer.tsx`, `Dashboard.tsx`, `ProgressCharts.tsx`

**Out of scope**
- Landing page (per existing constraint).
- Logic/feature changes — visual + a11y layer only.
- Replacing the table-based admin UX on desktop; we add a card layout below `md:` only.
