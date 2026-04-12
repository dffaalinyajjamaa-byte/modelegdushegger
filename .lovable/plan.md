

## Full Admin Portal Rebuild + National Exams + RLS Fix

This plan covers three areas: (1) fixing the storage RLS error blocking admin uploads, (2) inserting all national exam data, and (3) rebuilding the admin dashboard into a comprehensive management portal.

---

### Part 1: Fix Storage RLS — Root Cause of Upload Error

**Problem:** The `books-for-grade-6-auto-quiz` and `books-for-grade-8-auto-quiz` storage buckets exist but have **zero RLS policies on `storage.objects`**. When an admin uploads a PDF, the INSERT is blocked by default-deny RLS.

**Fix (Migration):**
```sql
-- Allow admins to upload to auto-quiz book buckets
CREATE POLICY "Admins can upload quiz books"
  ON storage.objects FOR INSERT
  WITH CHECK (
    (bucket_id = 'books-for-grade-6-auto-quiz' OR bucket_id = 'books-for-grade-8-auto-quiz')
    AND public.has_role(auth.uid(), 'admin')
  );

-- Allow public read (buckets are already public)
CREATE POLICY "Public read quiz books"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'books-for-grade-6-auto-quiz' OR bucket_id = 'books-for-grade-8-auto-quiz');

-- Allow admins to delete from quiz book buckets
CREATE POLICY "Admins can delete quiz books"
  ON storage.objects FOR DELETE
  USING (
    (bucket_id = 'books-for-grade-6-auto-quiz' OR bucket_id = 'books-for-grade-8-auto-quiz')
    AND public.has_role(auth.uid(), 'admin')
  );
```

Also add a `grade_level` column to `national_exams` for proper grade filtering (currently relies on parsing `description` text, which is fragile):

```sql
ALTER TABLE public.national_exams ADD COLUMN IF NOT EXISTS grade_level TEXT;
UPDATE public.national_exams SET grade_level = 'Grade 8' WHERE description LIKE '%Grade 8%';
```

And add admin INSERT/UPDATE/DELETE policies for `national_exams` (currently only has SELECT):

```sql
CREATE POLICY "Admins can insert national exams" ON public.national_exams
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update national exams" ON public.national_exams
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete national exams" ON public.national_exams
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

Similarly for `content` table (videos, books) — add admin write policies:
```sql
CREATE POLICY "Admins can update content" ON public.content
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete content" ON public.content
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

---

### Part 2: Insert National Exam Data

Insert all provided exams using the data insert tool. Two batches:

**Grade 8 exams (11 new records):**
| Subject | Year | URL |
|---------|------|-----|
| Afaan Ingiliffaa | 2016 | 1434dJQ9-... |
| Herreega | 2016 | 11OXzhvc7... |
| Afaan Amaara | 2016 | 1rSnxB4p... |
| Lammummaa | 2016 | 1ZbaudVlk... |
| Saayinsii Waliigalaa | 2015 | 1TNniMwos... |
| Afaan Oromoo | 2016 | 1T5EMc2c... |
| Herreega | 2015 | 1lMnMncn... |
| Hawaasa | 2015 | 1chVmZMg... |
| Afaan Ingiliffaa | 2015 | 16YSeq2j... |
| Afaan Oromoo | 2015 | 1vlmDr_q... |
| Lammummaa | 2015 | 1zrPPrqE... |

**Grade 6 exams (10 new records):**
| Subject | Year | URL |
|---------|------|-----|
| Afaan Oromoo | 2016 | 1wsenl0Z... |
| Afaan Oromoo | 2017 | 1zmsfVuF... |
| Afaan Ingiliffaa | 2016 | 1Q8T97f8... |
| Herreega | 2016 | 1eHhTap3... |
| Saayinsi naannoo | 2016 | 13sIbhFI... |
| Saayinsi naannoo | 2017 | 1sOnL10R... |
| Gadaa fi Safuu | 2017 | 1jTxn8jM... |
| Gadaa fi Safuu | 2016 | 1lXJ5EZu... |

(Skipping Afaan Ingiliffaa 2017 Grade 6 — no URL provided)

All will use the `grade_level` column for proper filtering.

---

### Part 3: Rebuild Admin Dashboard — Full Academic Admin

The current admin panel only has: Overview stats, Book Manager, Users list, Analytics. 

**New admin panel structure with 7 tabs:**

| Tab | Purpose |
|-----|---------|
| Overview | Stats dashboard (users, books, exams, quizzes, certificates) |
| National Exams | Upload/manage national exam PDFs by grade, subject, year |
| Auto Quiz Books | Current book upload + processing (keep existing) |
| Videos & Content | Upload/manage video lessons and digital books |
| Quiz Editor | View quiz results, edit quiz answers from backend |
| Users | User management with role badges and activity |
| Analytics | Performance reports by subject, pass rate, weak areas |

**New admin components:**

| File | Purpose |
|------|---------|
| `src/components/admin/AdminNationalExams.tsx` | CRUD for national exams: upload PDF, set subject/year/grade |
| `src/components/admin/AdminContentManager.tsx` | Manage videos and digital books (edit, delete, add) |
| `src/components/admin/AdminQuizEditor.tsx` | View auto-quiz results, edit quiz answers stored in results |

**Modified files:**

| File | Changes |
|------|---------|
| `src/components/admin/AdminDashboard.tsx` | Add new tabs, import new components, remove student-style UI |
| `src/components/NationalExams.tsx` | Use `grade_level` column instead of parsing `description` |

**AdminNationalExams.tsx features:**
- Form: title, subject (dropdown), year, grade (6/8), PDF file upload
- Uploads PDF to a new `national-exam-pdfs` storage bucket (public)
- Inserts record into `national_exams` table
- Lists all exams grouped by grade, filterable by subject
- Edit/delete capability

**AdminContentManager.tsx features:**
- View all content (videos + books) from `content` table
- Add new content: title, URL, type (video/pdf), subject, grade
- Edit existing content metadata
- Delete content

**AdminQuizEditor.tsx features:**
- View all `auto_quiz_results` with user name, score, subject
- Drill into individual results to see answers
- Ability to override/correct quiz answers

---

### Part 4: Storage Bucket for National Exam PDFs

Create a new public bucket `national-exam-pdfs` with admin-only upload policies:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('national-exam-pdfs', 'national-exam-pdfs', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read national exam pdfs" ON storage.objects
  FOR SELECT USING (bucket_id = 'national-exam-pdfs');
CREATE POLICY "Admins can upload national exam pdfs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'national-exam-pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete national exam pdfs" ON storage.objects
  FOR DELETE USING (bucket_id = 'national-exam-pdfs' AND public.has_role(auth.uid(), 'admin'));
```

---

### Implementation Order

1. **Migration** — Storage RLS policies for quiz book buckets + national exam admin policies + grade_level column + national exam PDF bucket
2. **Data insert** — All 21 national exam records (Grade 6 + Grade 8)
3. **AdminNationalExams.tsx** — New component for national exam management
4. **AdminContentManager.tsx** — New component for video/book content management
5. **AdminQuizEditor.tsx** — New component for quiz result viewing/editing
6. **AdminDashboard.tsx** — Rebuild with 7 tabs, professional admin-only design
7. **NationalExams.tsx** — Update to use `grade_level` column for filtering

