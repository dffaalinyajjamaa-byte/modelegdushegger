# Phase Plan — Liquid Glass Polish + Functional Fixes

A focused single-phase pass covering all the items you listed.

## 1. Google OAuth — auto-enable & redirect to Dashboard

- Call `configure_social_auth` to enable Google (keep email).
- In `AuthForm.tsx`, after `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` succeeds (non-redirect path), navigate to `/` (Dashboard route in `Index.tsx`). For the redirect path, ensure `Index.tsx` detects an active session on mount and routes to Dashboard.
- Confirm `redirect_uri` matches the published origin.

## 2. AI Chat identity bug ("built by J Hope" on every message)

- Edit `supabase/functions/ai-chat/index.ts` and `ai-teacher-oromo/index.ts` system prompt:
  - Add a strict instruction: "Only mention identity/creator if the user's last message matches the identity-question regex; otherwise NEVER mention J Hope or who built you."
  - Add a server-side regex guard: detect identity questions (en/am/om: name, who are you, who made/built/developed you, manfaa, ስም, ማን ሰራህ). If matched, allow identity reply; else strip any sentence containing "J Hope/J-Hope/built by/developed by" from the model output before returning.

## 3. AI Teacher — Book-based Q&A suggestions

- In `AITeacher.tsx`, when user toggles "Answer from Book":
  - Subject selector → fetch books from `auto_quiz_books` filtered by subject + grade + language.
  - Book selector → load extracted chunks (`auto_quiz_chunks`) for context.
  - Language selector (English / Amharic / Oromo).
  - Show suggestion chips: "Summarize this chapter", "Key points", "Quiz me", "Explain like I'm a student", "Translate to {lang}".
  - Pass `bookContext`, `language`, `subject` to the edge function.

## 4. Student-created Quizzes with language selection

- In `QuizFeature.tsx` add a "Create your own quiz" entry that opens a setup modal mirroring `auto-quiz/AutoQuizSetup.tsx`:
  - Subject, grade, **language (EN/AM/OM)**, number of questions, source (book or topic prompt).
  - Generates via `generate-auto-quiz` edge function. Saves to existing `auto_quiz_results` flow on submit.
- Save the generated quiz set into `task_manager` (see #5) as a study task.

## 5. AI-generated quiz → Task Manager

- In `TaskManager.tsx` add a "Study Tasks" section.
- When AI Teacher / Student Quiz generates a quiz, insert a row into the existing tasks table with:
  - title = "Quiz: {subject}", due_date = +3 days default, source = "ai_quiz", payload = quiz id.
- Add progress chip (Not started / In progress / Done) and link back to the quiz play screen.

## 6. NearbyMap filters

- Add floating-island filter chips above the map (Subject categories + Price ranges: <100, 100–500, 500–1500, >1500 ETB).
- Filter `geoProducts` client-side before rendering markers.
- Fix the "white screen" bug: it's caused by Leaflet container needing a known height before tiles render. Wrap the map in a div with explicit `height: 380px` (already set) **and** call `map.invalidateSize()` after mount via a tiny effect — add an `InvalidateOnMount` child component.

## 7. Profile + Messenger search

- `Messenger.tsx`: add a top-right search icon button. Tapping opens a Liquid-Glass popover (anchored top-right) with input that queries `search_users_similar` RPC and shows results as glass list cells. Tap → open chat.
- `StudentProfile.tsx`: add small enhancements — bio edit, favorite subject, school, goals (already in schema), plus a "Find friends" button reusing the same search popover.

## 8. Apple-style Liquid Glass pass on remaining screens

Apply `lg-island` floating header + `lg-glass rounded-3xl` cells + Lucide-only icons + 44pt touch targets to:

- `AiChat.tsx` (refine), `Messenger.tsx`, `StudentProfile.tsx`, `AboutUs.tsx`, `Leaderboard.tsx`, `RelaxTime.tsx`, `Channels.tsx`, `Stories.tsx`, `Settings.tsx`, `NationalExams.tsx`, `Worksheets.tsx`, `DigitalBooksLibrary.tsx`, `VideoLessonsLibrary.tsx`, `ScienceExperiments.tsx`, `Competition.tsx`, `DailyChallenge.tsx`, `SmartPlanner.tsx`, `TeacherStudios.tsx`, `StudyByMusic.tsx`, `MarketplaceHome.tsx` (refine).
- Admin sub-cards: `AdminBookManager`, `AdminQuizList`, `AdminUserManager`, `AdminMarketplace`, `AdminWorksheetManager`, `AdminBadgeVerification`, `AdminContentManager`, `AdminNationalExams`, `AdminResults`.
- Auto-quiz screens: `AutoQuiz`, `AutoQuizPlay`, `AutoQuizResult`, `AutoQuizSetup`, `CertificateView`.

Header pattern:

```tsx
<header className="lg-island sticky top-3 mx-3 z-30 px-4 py-3 flex items-center gap-3">
  <button className="lg-press h-11 w-11 rounded-full grid place-items-center"><AppIcon name="back" /></button>
  <h1 className="text-[17px] font-semibold tracking-tight">Title</h1>
</header>
```

## 9. Vercel deploy from GitHub keeps failing

Likely causes & fixes:

- `vercel.json` rewrites currently serve `/index.html` for asset paths too. Tighten regex to exclude `/assets`, `/favicon.ico`, image extensions.
- Set Vercel build to `bun run build`, output `dist`, install `bun install`.
- Add `NODE_VERSION=20` env hint via `engines` in `package.json`.
- PWA: ensure `navigateFallbackDenylist: [/^\/~oauth/, /^\/assets/]` in `vite.config.ts` to prevent SW caching breaking deploys.
- Add `.vercelignore` to skip `supabase/`, `.lovable/`.

## Technical notes

- New files: none required beyond a small `<MapChips />` and `<UserSearchPopover />` component.
- Migrations: none — reuse `tasks`, `auto_quiz_*` tables.
- Edge function deploy will happen automatically after editing `ai-chat` and `ai-teacher-oromo`.

## Out of scope

- New gamification mechanics, new tables, push notifications.

Approve and I will implement everything in one pass.Create study tasks in my task manager from the AI Teacher’s generated quizzes so I can track due dates and progress.and in student quiz for them selves like admin do select languageReskin the remaining admin sub-cards and any unstyled viewer screens with the floating-island header and Liquid Glass cards. (Auth, Marketplace, Admin, Quiz play, etc.)Add map filter chips to NearbyMap so I can quickly show products by subject or price range.