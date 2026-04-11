

## Fix Admin Auth + Add Certificate System

### Findings

**Backend URL:** The frontend uses `VITE_SUPABASE_URL` (`https://asqxdhqcqexoxodrnjal.supabase.co`) everywhere — no localhost or hardcoded URLs. The configuration is correct.

**Root cause of "Unable to connect to server":** The `testConnection()` function in `AuthForm.tsx` (line 55-73) makes a HEAD request to `/rest/v1/` before every login/signup. In the Lovable preview environment, this fetch can be intercepted by the preview proxy, causing a false `TypeError: Failed to fetch`, which triggers the `NETWORK_ERROR` path and blocks auth entirely. This is a known preview-environment issue.

**Missing admin codes:** The migration file `20260410094838` creates the `admin_codes` table but does NOT insert the 35 ODA codes — there's no `INSERT INTO admin_codes` in any migration. The codes were never actually added to the database.

**Admin login flow:** Currently admin code is only required during signup (correct per user preference). But the submit button says "Create Account" for admin too (should say "Create Admin Account").

---

### Plan

#### 1. Fix the `testConnection` false-positive network error

Remove the aggressive `testConnection()` gate that blocks auth. Instead, let auth requests go through directly and handle actual errors gracefully. The `navigator.onLine` check is sufficient as a pre-check.

**File:** `src/components/AuthForm.tsx`
- Remove lines 349-353 (the `testConnection` call before auth)
- Keep the `testConnection` function available only for the manual "Retry Connection" button
- Update error handling to distinguish real auth errors from network errors more precisely

#### 2. Insert the 35 admin codes via migration

Create a new database migration to insert all 35 ODA codes into `admin_codes`:

```sql
INSERT INTO public.admin_codes (code) VALUES
('ODA-A2A3S3S8A3'), ('ODA-B7K9D2P4L1'), ... (all 35 codes)
ON CONFLICT (code) DO NOTHING;
```

#### 3. Fix submit button text for admin

**File:** `src/components/AuthForm.tsx` line 971
- Change from: `userRole === 'teacher' ? 'Create Teacher Account' : 'Create Account'`
- To: `userRole === 'admin' ? 'Create Admin Account' : userRole === 'teacher' ? 'Create Teacher Account' : 'Create Account'`

#### 4. Add Certificate Generation System

Create a luxury premium certificate with:
- Logo on top left
- AI signature with name "Hope, CEO of J-Hope Technologies"
- Student name from signup info, grade, completed subjects, date
- Premium gold/dark design

**New files:**
- `src/components/auto-quiz/CertificateView.tsx` — Certificate viewer/generator component
- Edge function or client-side PDF generation using canvas/HTML-to-image approach

**Certificate logic** (in `AutoQuizResult.tsx`):
- After saving a quiz result, check if user has passed ALL subjects for their grade
- If yes, generate certificate and store URL in `certificates` table
- Show certificate download/view button

**Certificate design:**
- Dark background with gold accents and border
- School logo top-left
- "Certificate of Excellence" heading
- Student name, grade, all passed subjects listed
- Date of completion
- AI signature: "Hope, CEO of J-Hope Technologies"
- Downloadable as image/PDF

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/AuthForm.tsx` | Remove testConnection gate, fix admin button text |
| `src/components/auto-quiz/AutoQuizResult.tsx` | Add certificate check after saving result |
| New migration | Insert 35 ODA admin codes |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/auto-quiz/CertificateView.tsx` | Luxury certificate component with download |

### Implementation Order

1. Database migration — insert admin codes
2. Fix AuthForm — remove testConnection gate + fix button text
3. Build CertificateView component
4. Integrate certificate check into AutoQuizResult

