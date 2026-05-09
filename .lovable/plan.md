## Scope

This is a large multi-screen redesign + feature work. I'll batch it into focused workstreams using existing Liquid Glass tokens (`.lg-glass`, `.lg-island`, `.lg-press`, `.lg-skeleton`) already in `index.css`.

### 1. Marketplace (`MarketplaceHome.tsx`, `NearbyMap.tsx`)
- Floating-island sticky header (back, title, Nearby + Sell actions) with `lg-island` + `lg-press`.
- Search + category chips wrapped in glass surfaces.
- Product cells → `.lg-glass rounded-3xl` with refined typography, distance badge.
- Empty state: glass illustration card with primary CTA.
- Loading state: replace `Skeleton` with `SkeletonGlass` cells.
- **Map popup**: when a product marker is clicked on `NearbyMap`, show a floating glass popup at the marker's exact lat/lng with the product image, title, price, and "View" button.

### 2. PDF Viewer (`PDFViewer.tsx`)
- Sticky `.lg-island` header (back, title, page indicator, download).
- Glass card frame around the iframe.
- Replace blocking spinner with `SkeletonViewer` glass skeleton during fetch.
- Error state: glass card with retry button.

### 3. Video Viewer (`VideoViewer.tsx`)
- Same `.lg-island` sticky header (back, title, share/like).
- Glass cell for description / metadata below the player.
- Glass skeleton while video metadata loads.
- Play state: glass overlay play button. Error state: glass card with retry.

### 4. Admin Dashboard (`AdminDashboard.tsx` + a few key admin cards)
- Wrap dashboard in `.lg-island` header with admin title + tabs.
- Stat cards → `.lg-glass rounded-3xl p-4` with Lucide icons (no emoji).
- Skeleton glass loaders while content lists load.
- Apply pattern to `AdminQuizList`, `AdminBookManager`, `AdminUserManager` cell rows only (no logic changes).

### 5. Auth (`AuthForm.tsx`)
- Floating-island top header with logo + "Sign in / Sign up" pill.
- Glass card containing the form on a softly blurred backdrop.
- Add **Google sign-in** via Lovable Cloud managed OAuth (`lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`) — call `configure_social_auth` first.
- Glass skeleton on submit while pending; consistent toasts.

### 6. AI Chat / Messege screen (`AiChat.tsx` and shared chat shell)
- Reduce header height (compact "Messege" pill dropdown, small menu glass button, circular play button).
- Move chat composer slightly above the bottom nav (`bottom: calc(var(--bottom-nav) + 12px)`) with `pb-28` content padding.
- Bubble redesign: AI bubble = lighter glass, user bubble = darker glass; thin border, soft shadow, 28–32px radius.
- Composer: large `.lg-glass` rounded-[32px] container with inset action chips, black circular send button.
- Backdrop blur 20–40px; subtle fade/slide-up reveal on new bubbles (respect `.lg-reduce-motion`).
- Typography: Apple HIG hierarchy, medium weight, spacious line-height.

### 7. AI Teacher behavior fixes
- Identity reply: only respond "I'm developed by J Hope" when the user **explicitly asks** "what's your name / who are you / who made you / who developed you" (in EN/AM/OM). Otherwise never inject the identity line. Implement via a regex guard inside `supabase/functions/ai-teacher-oromo/index.ts` (or wherever the system prompt is composed) and update the system prompt to forbid unsolicited self-introduction.
- **Answer based on Book** toggle: add a "Answer from Book" button next to the subject selector in `AITeacher.tsx`. When enabled, the chosen subject's admin-uploaded book (from `books` table / `books-for-grade-X-auto-quiz` bucket filtered by grade + subject) is fetched, its extracted text passed as context to the edge function, and the model is instructed to answer / summarize strictly from that book. Add quick-action chips: "Summarize", "Key points", "Quiz me".

### 8. Vercel deployment glitch
- Likely cause: `GlobalBackground` / `Hyperspeed` / `Iridescence` WebGL canvases re-initializing on route change and a missing `base` in `vite.config.ts` for non-root deploys. Fixes:
  - Add `base: "/"` and `build.target: "es2020"` if missing.
  - Guard WebGL components with `useEffect` cleanup + `prefers-reduced-motion`.
  - Ensure `index.html` references hashed assets (Vite default) and PWA service worker doesn't cache `/~oauth`.
  - Add `vercel.json` with SPA rewrite `{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }` to fix route-refresh 404 / flash glitch.

### 9. Out of scope
- Landing page (per memory).
- Logic changes to Quiz scoring, Worksheets data model, Admin CRUD.
- Desktop admin tables (only mobile cells get the glass treatment).

## Files to edit
- `src/components/marketplace/MarketplaceHome.tsx`, `marketplace/NearbyMap.tsx`
- `src/components/PDFViewer.tsx`, `src/components/VideoViewer.tsx`
- `src/components/admin/AdminDashboard.tsx` (+ light pass on `AdminQuizList`, `AdminBookManager`, `AdminUserManager`)
- `src/components/AuthForm.tsx`
- `src/components/AiChat.tsx`, `src/components/AITeacher.tsx`
- `supabase/functions/ai-teacher-oromo/index.ts` (and `ai-chat/index.ts` if it shares the identity prompt)
- `vite.config.ts`, new `vercel.json`

## Files to create
- `src/components/ui/glass-popup.tsx` (map marker popup card).
- `vercel.json`.

## Order of execution
1. Run `configure_social_auth` for Google, then update `AuthForm.tsx`.
2. AI Teacher edge function identity fix + book-context prompt.
3. AiChat + AITeacher UI.
4. Marketplace + NearbyMap popup.
5. PDFViewer + VideoViewer.
6. AdminDashboard pass.
7. Vercel config.

Confirm and I'll execute end-to-end.
