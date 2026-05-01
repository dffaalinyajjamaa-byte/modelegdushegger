## Scope

The previous phases already shipped: AiChat full-page scroll + chat-above-navbar, smaller Messenger header, search bar filtering chats/friends, "People You May Know" removed, AI identity guard in `ai-teacher-oromo`, real-time `admin_quizzes` → student `QuizFeature`, admin Quiz Creator + Worksheet Manager.

This phase wires the **real-time streak/points/progress system to actual study minutes** and finishes the **DB-driven Worksheets + admin Quiz list/edit/delete** flow. It also redesigns the Dashboard progress visualizations.

---

## 1. Real study-time tracking → fuels everything

Currently `video_progress` exists but never writes to `daily_stats.learning_time_minutes`, so streak (badge tier), Charging Points and weekly charts stay at 0.

- Create `src/hooks/use-learning-time.ts`
  - Heartbeat hook: every 60s while active, calls `supabase.rpc('increment_daily_stat', { p_user_id, p_stat_type: 'learning_minutes', p_increment: 1 })`.
  - Pauses on tab hidden / video paused.
- Extend DB function `increment_daily_stat` with a new branch `learning_minutes` that updates `daily_stats.learning_time_minutes` (migration).
- Use the hook inside `VideoViewer`, `PDFViewer`, `BookAIChat`, `AiChat`, `AutoQuizPlay`, `QuizFeature` so any active study screen counts.
- After each minute increment, call `supabase.rpc('award_points', { p_user_id, p_points: 1, p_activity_type: 'study_minute' })`. `award_points` already calls `update_user_streak`, which the existing `update_badge_tier` trigger turns into Beginner → Bronze (10) → Silver (20) → Metal Green (50) → Gold (90).

Result: streak counts only days with ≥1 study minute, badge auto-upgrades at 10/20/50/90, Charging Points grows in real time (already wired in `ChargingPoints.tsx`).

## 2. Streak / next-rank UI polish

`StreakBadge.tsx` already renders rank + "Next: Bronze (10)". Update it to show **dynamic days-to-go** (`10 - currentStreak`, etc.) and pull `current_streak`, `longest_streak`, `badge_tier` live via the existing `use-streak` realtime channel. No schema change.

## 3. Overall Progress redesign (Today + All-time cards)

In `Dashboard.tsx` Progress tab, replace the 3 plain stat cards with a 3-card row where each card shows:

- Big number = today (from `daily_stats` for `CURRENT_DATE`)
- Small number = all-time (sum across `daily_stats` for that user)

Cards: Videos Watched, Books Read, Tasks Done. Tailwind `flex gap-3` + `flex-1 rounded-lg border bg-card px-4 py-3`. Subscribe to `daily_stats` realtime.

## 4. Weekly Activity + Total Stats + Activity Distribution

Refactor `ProgressCharts.tsx`:

- Source: last 7 days of `daily_stats` (real-time channel).
- **Weekly Activity**: filter buttons `Tasks / Videos / Materials` switching the recharts `<BarChart>` series. X-axis = Mon..Sun, Y-axis auto-scaled.
- **Total Stats**: 3-bar mini chart with auto Y-scale (max of three sums), replacing the fixed 0–4 scale.
- **Activity Distribution**: recharts `<PieChart>` donut over last 30 days with legend Tasks / Videos / Materials and percentage labels.

## 5. Admin Quiz list (read / edit / delete previous quizzes)

Today `AdminDashboard.tsx` only offers *create* via `AdminQuizCreator` and the "Results" panel shows `auto_quiz_results`. Add a new component:

- `src/components/admin/AdminQuizList.tsx`
  - Lists rows from `admin_quizzes` (real-time subscription).
  - Filters by grade + subject.
  - Expand row → show questions, correct option highlighted.
  - Edit dialog: rename, change subject/grade, edit/add/remove questions, save → `update`.
  - Delete with confirm.
- Add a new `AdminSection` value `quiz-manage` and a sidebar entry "Quizzes" between Create and Results in `AdminDashboard.tsx`.
- Updates flow to students automatically (QuizFeature already subscribes to `admin_quizzes` realtime).

## 6. Worksheets: read uploaded admin worksheets + Show/Hide answers view

Two changes to satisfy "admin can read worksheets" + "students see them in real time":

a. Replace hard-coded gdrive list in `src/components/Worksheets.tsx` with:
   - Primary list = `worksheets` table (PDF uploads from `AdminWorksheetManager`), filtered by user grade, real-time channel.
   - Secondary tab "Quiz Worksheets" = rows from `admin_quizzes` filtered by grade/subject, rendered as printable question list.
     - Toggle button **Show Answers / Hide Answers** that reveals correct option + explanation (admins always see toggle; students get it too — matches the requested teacher/worksheet view).
   - PDFs open inline via the existing `PDFViewer` iframe (no external nav), respecting the embedded-content rule.

b. AdminWorksheetManager already supports upload/delete; just confirm it's surfaced and that newly uploaded worksheets appear instantly for students via realtime (table is already in `supabase_realtime`).

## 7. AI identity filter — extend to all entry points

`ai-teacher-oromo` is hardened. Verify and (if missing) add the same `applyIdentityFilter` + system rule to `supabase/functions/ai-chat/index.ts` and `supabase/functions/ai-book-helper/index.ts` so any chat surface answers "I am J-Hope AI, developed by J-Hope Technologies — the largest language model in Ethiopia." when asked name/model.

## 8. Confirmations (no work, only verify)

- AiChat already wraps in `mx-auto max-w-3xl mt-4 mb-24` with internal scroll `max-h-[60vh]` — matches the requested layout.
- Messenger header already `text-sm font-semibold` with compact padding and inline search filtering chats by name / search_id / user_id; "People You May Know" already removed.
- AutoQuiz already PDF→Gemini direct, in-page result.

---

## Database changes

```sql
-- Extend stat increment to support learning minutes
CREATE OR REPLACE FUNCTION public.increment_daily_stat(
  p_user_id uuid, p_stat_type text, p_increment integer DEFAULT 1
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.daily_stats (
    user_id, date, tasks_completed, videos_watched, materials_read,
    ai_interactions, exams_taken, learning_time_minutes
  ) VALUES (
    p_user_id, CURRENT_DATE,
    CASE WHEN p_stat_type='tasks' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type='videos' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type='materials' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type='ai' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type='exams' THEN p_increment ELSE 0 END,
    CASE WHEN p_stat_type='learning_minutes' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    tasks_completed       = daily_stats.tasks_completed       + CASE WHEN p_stat_type='tasks'             THEN p_increment ELSE 0 END,
    videos_watched        = daily_stats.videos_watched        + CASE WHEN p_stat_type='videos'            THEN p_increment ELSE 0 END,
    materials_read        = daily_stats.materials_read        + CASE WHEN p_stat_type='materials'         THEN p_increment ELSE 0 END,
    ai_interactions       = daily_stats.ai_interactions       + CASE WHEN p_stat_type='ai'                THEN p_increment ELSE 0 END,
    exams_taken           = daily_stats.exams_taken           + CASE WHEN p_stat_type='exams'             THEN p_increment ELSE 0 END,
    learning_time_minutes = daily_stats.learning_time_minutes + CASE WHEN p_stat_type='learning_minutes'  THEN p_increment ELSE 0 END;
END;$$;
```

`worksheets`, `admin_quizzes`, `daily_stats`, `user_rankings` already have realtime enabled.

## Files

| Created | Modified |
|---|---|
| `src/hooks/use-learning-time.ts` | `src/components/Dashboard.tsx` (Progress tab cards, today+all-time) |
| `src/components/admin/AdminQuizList.tsx` | `src/components/ProgressCharts.tsx` (filters, donut, auto-scale) |
| migration: extend `increment_daily_stat` | `src/components/StreakBadge.tsx` (days-to-go) |
| | `src/components/Worksheets.tsx` (DB-driven + show/hide answers tab) |
| | `src/components/admin/AdminDashboard.tsx` (add Quizzes section) |
| | `src/components/VideoViewer.tsx`, `PDFViewer.tsx`, `BookAIChat.tsx`, `AiChat.tsx`, `auto-quiz/AutoQuizPlay.tsx`, `QuizFeature.tsx` (mount `useLearningTime`) |
| | `supabase/functions/ai-chat/index.ts`, `ai-book-helper/index.ts` (identity guard) |
