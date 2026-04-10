

## Auto Quiz System + Admin Portal

This is a large feature with multiple parts. Here is the implementation plan.

---

### Part 1: Insert Admin Codes into Database

Insert the 35 ODA-prefixed admin codes into the existing `teacher_codes` table (reusing its structure for admin codes), or create a dedicated `admin_codes` table.

**Decision:** Create a new `admin_codes` table to keep admin authentication separate from teacher codes.

---

### Part 2: Database Schema (Migration)

Create these new tables:

```sql
-- Admin codes table
CREATE TABLE admin_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto quiz books (admin-uploaded textbooks)
CREATE TABLE auto_quiz_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  pdf_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Book units (chapters/sections)
CREATE TABLE auto_quiz_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES auto_quiz_books(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL,
  unit_title TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Book chunks (text content per unit)
CREATE TABLE auto_quiz_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES auto_quiz_books(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES auto_quiz_units(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto quiz results
CREATE TABLE auto_quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES auto_quiz_books(id),
  subject TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  passed BOOLEAN DEFAULT false,
  answers JSONB,
  time_taken INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Certificates
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  certificate_url TEXT,
  subjects_completed JSONB,
  issued_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies:**
- `admin_codes`: Public SELECT (to verify), UPDATE for claiming
- `auto_quiz_books/units/chunks`: Authenticated SELECT; admin INSERT/UPDATE/DELETE
- `auto_quiz_results`: Users manage own results
- `certificates`: Users view own certificates

Insert the 35 ODA codes via the data insert tool.

---

### Part 3: Admin Role Setup

- Add `'admin'` to the existing `app_role` enum (already has `student`, `teacher`, `admin`)
- Admin login: After email+password auth, verify admin code from `admin_codes` table, then assign `admin` role in `user_roles`
- Update `AuthForm.tsx` to add an "Admin" role option with admin code field

---

### Part 4: Edge Functions

**`supabase/functions/process-quiz-book/index.ts`**
- Receives PDF URL from admin upload
- Uses Gemini (Lovable AI Gateway) to:
  1. Extract text from PDF
  2. Detect units/chapters
  3. Split into chunks (200-5000 words)
  4. Store chunks in `auto_quiz_chunks` table

**`supabase/functions/generate-auto-quiz/index.ts`**
- Receives: book_id, unit_ids, question_count, language
- Retrieves relevant chunks from database
- Sends to Gemini to generate structured quiz questions
- Returns JSON array of questions with options A-D, answer, explanation
- Strict rule: 90% from book content only

---

### Part 5: Frontend Components

#### 5.1 Admin Portal (`src/components/admin/`)
- **`AdminDashboard.tsx`** - Overview stats (total users, books, quizzes, avg scores)
- **`AdminBookManager.tsx`** - Upload books, assign grade/subject/language, view processing status
- **`AdminUnitManager.tsx`** - View/edit/reorder units per book
- **`AdminUserManager.tsx`** - View users, track progress, quiz results
- **`AdminResults.tsx`** - Analytics: performance by subject, pass rate, weak areas

#### 5.2 Auto Quiz Student UI (`src/components/auto-quiz/`)
- **`AutoQuiz.tsx`** - Main container: book selection (filtered by user grade) → unit selection → question count → quiz
- **`AutoQuizSetup.tsx`** - Select book, units (one/multiple/all), question count (20/40/60/70/100)
- **`AutoQuizPlay.tsx`** - One question per screen, global timer (questions × 1.5 min), progress bar
- **`AutoQuizResult.tsx`** - Score, percentage, pass/fail, explanations from book
- **`CertificateView.tsx`** - View/download certificate when all subjects passed

---

### Part 6: Dashboard Integration

- Add `'auto-quiz'` and `'admin'` to `ActiveView` type
- Add Auto Quiz button next to Teacher Studios in the quick-access grid
- Add Admin Portal access (only visible to admin role users)
- Update `AuthForm.tsx` with admin signup option

---

### Part 7: Certificate Generation

- When user passes ALL subjects for their grade (≥50%), generate certificate
- Use an edge function or client-side to create a PDF certificate with user name, grade, subjects, date
- Store URL in `certificates` table

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/auto-quiz/AutoQuiz.tsx` | Main auto quiz container |
| `src/components/auto-quiz/AutoQuizSetup.tsx` | Book/unit/question selection |
| `src/components/auto-quiz/AutoQuizPlay.tsx` | Quiz taking UI |
| `src/components/auto-quiz/AutoQuizResult.tsx` | Results display |
| `src/components/auto-quiz/CertificateView.tsx` | Certificate viewer |
| `src/components/admin/AdminDashboard.tsx` | Admin overview |
| `src/components/admin/AdminBookManager.tsx` | Book upload/management |
| `src/components/admin/AdminUnitManager.tsx` | Unit management |
| `src/components/admin/AdminUserManager.tsx` | User management |
| `src/components/admin/AdminResults.tsx` | Results analytics |
| `supabase/functions/process-quiz-book/index.ts` | PDF processing pipeline |
| `supabase/functions/generate-auto-quiz/index.ts` | AI quiz generation |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/Dashboard.tsx` | Add auto-quiz + admin views, quick-access buttons |
| `src/components/AuthForm.tsx` | Add admin role with code verification |
| `supabase/config.toml` | Add new edge functions |

### Implementation Order

1. Database migration (6 tables + RLS + insert 35 admin codes)
2. Update AuthForm for admin login
3. Create edge functions (process-quiz-book, generate-auto-quiz)
4. Build Auto Quiz student UI (4 components)
5. Build Admin Portal (5 components)
6. Integrate into Dashboard
7. Certificate system

