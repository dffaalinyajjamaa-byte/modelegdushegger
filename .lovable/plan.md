
This is a massive multi-feature request. Let me organize it into focused phases. Most database tables already exist (`profiles`, `daily_stats`, `user_rankings`, `messaging_users`, `admin_quizzes`, `worksheets`, `auto_quiz_books`, etc.) so I can mostly do code-level changes.

Let me break this down by area:

**1. AI Chat Layout Fix** — full-page scroll, chat box above navbar, inner scrollable messages with `max-h-[60vh]`, `min-h-screen flex flex-col` wrapper.

**2. Messenger Cleanup** — remove "People You May Know" / recommended friends section entirely, smaller "Messages" header, search bar that filters real chat list & friends only.

**3. Dashboard Streak + Points System (Real-time)**
- Use existing `daily_stats.learning_time_minutes` + `user_rankings` (current_streak, longest_streak, total_points, badge_tier already exist)
- Recompute streak from consecutive days where `learning_time_minutes > 0` OR any activity > 0
- Update badge tier mapping: Beginner (0-9), Bronze (10-19), Silver (20-29), Metal Green (50+), Gold (90+) — already in `update_badge_tier()` trigger but adjust thresholds in UI
- Show "Next: Bronze (10), X days to go" dynamic copy
- Charging Points: 1 minute = 1 point, persist via existing `award_points` RPC

**4. Overall Progress + Weekly Activity + Total Stats + Activity Distribution**
- Use existing `daily_stats` table (tasks_completed, videos_watched, materials_read, exams_taken)
- Build 3 cards (Today / All-time) for Videos, Books, Tasks
- 7-day filterable bar chart (Tasks/Videos/Materials)
- Total Stats: 3 bars with auto-scaling Y-axis
- Activity Distribution: donut chart from last 30 days
- Real-time refetch via Supabase realtime on `daily_stats`

**5. Auto Quiz — already PDF→Gemini direct, verify & polish loading state, keep on same page**

**6. Admin Quiz Builder + Student Quiz pulling from `admin_quizzes` + Worksheet view**
- Admin quiz creator already exists in AdminDashboard
- Wire `QuizFeature.tsx` (Grade 8 Quizzes) to load from `admin_quizzes` filtered by subject + grade_level
- Timer derived from question count (1.5min/q) since admin_quizzes has no time_limit column — or add it
- New Worksheet view that reuses admin_quizzes with Show/Hide Answers toggle

**Schema additions needed:**
- Add `time_limit_minutes INTEGER DEFAULT 30` to `admin_quizzes`
- Enable realtime on `daily_stats`, `user_rankings`, `admin_quizzes`, `worksheets`

Keeping plan concise per instructions.
