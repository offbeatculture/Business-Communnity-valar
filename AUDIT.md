# 7 Forces Business Audit — In-Repo Handoff

**Branch:** `feature/seven-forces-audit`
**PR:** https://github.com/offbeatculture/Business-Communnity/pull/5
**Status:** Code complete, deployed to Vercel preview, in team testing. Not yet merged to main.

The full spec lives outside this repo at `workshops/Business Bootcamp - 1/v2-7-forces/membership/audit-scoring-rubric-v2.md`. This doc is the **in-repo handoff** — code map, how to extend, how to deploy.

---

## What it is

A public diagnostic funnel for Indian SME founders. They land on `/audit`, fill 17-18 questions (5 short screens after identity), and get a personalized verdict — focus force + named 90-day move + per-vertical translation snippet + 8-force score chart + strengths/risks/blind spots.

Designed as the entry point of the funnel: **bootcamp → free audit → ₹5K 1-2-1 → ₹9,999/yr membership.**

---

## Code map

```
Community App/
├── app/(audit)/                       # public funnel routes (no auth)
│   ├── layout.tsx                     # bare layout, no nav
│   ├── audit/
│   │   ├── page.tsx                   # intro + start CTA
│   │   ├── form/page.tsx              # 6-screen form
│   │   ├── results/[id]/page.tsx      # verdict + overlay + scores + signals
│   │   └── thank-you/page.tsx         # fallback (when results id missing)
│   │
├── app/api/audit/
│   └── submit/route.ts                # POST /api/audit/submit — zod + Supabase admin insert
│
├── components/audit/
│   └── AuditForm.tsx                  # the 6-screen mobile-first form component
│
├── lib/audit/
│   ├── types.ts                       # ForceKey, VerticalValue, AuditQuestion, AuditAnswers, QuestionOverlay
│   ├── questions.ts                   # 16 universal + Q17 + 5 Q18 candidates; SCREEN_GROUPS; VERTICAL_Q18; getScreenQuestionIds()
│   ├── scoring.ts                     # per-question + per-force scoring; Q9×Q17 combination rule
│   ├── playbook.ts                    # 8 named-move playbooks (universal)
│   ├── playbook-overlays.ts           # 14 verticals × 8 forces = 112 vertical translation snippets
│   ├── verdict.ts                     # computeVerdict(answers) — orchestrator
│   └── question-overlays/             # 14 files, one per vertical
│       ├── index.ts                   # QUESTION_OVERLAYS map + resolveQuestion()
│       ├── saas_b2b.ts
│       ├── agency_services.ts
│       ├── ecom_d2c.ts
│       ├── coaching_courses.ts
│       ├── manufacturing.ts
│       ├── restaurant_fnb.ts
│       ├── retail_offline.ts
│       ├── real_estate_broker.ts
│       ├── healthcare_clinic.ts
│       ├── education_school.ts
│       ├── events_weddings.ts
│       ├── construction_interior.ts
│       ├── logistics_transport.ts
│       └── professional_services.ts
│
├── middleware.ts                      # bypass for /audit and /api/audit (public routes)
└── supabase/migrations/
    └── 20260518_create_audit_submissions.sql
```

---

## How the engine flows

```
User submits form (AuditForm.tsx)
        │
        ▼
POST /api/audit/submit
        │  zod-validates identity + answers
        │  vertical-conditional coverage check (only the expected Q18 is required)
        ▼
Supabase admin insert into audit_submissions
        │  returns { id }
        ▼
Client redirects to /audit/results/{id}
        │
        ▼
Server component reads submission via createAdminClient()
        │
        ▼
computeVerdict(answers) in lib/audit/verdict.ts
        │  1. scoreAllForces(answers)                    [scoring.ts]
        │  2. evaluateMarketingBurn(answers)             [§ Q9×Q17 combo]
        │  3. applyMarketingBurnPenalty(scores, adj)
        │  4. pickFocusForce(scores, answers)
        │  5. extractSignals(answers)
        │  6. prepend burn-risk signal if applied
        │  7. compose context (revenue/headcount/age/stage_tag)
        │  8. lookup PLAYBOOKS[focus_force]
        ▼
Rendered: header + focus force + named-move card + per-vertical overlay + moves + signals + 8-force bars
```

---

## How to extend

### Adding a new vertical

1. Add to `VERTICALS` in `lib/audit/types.ts`
2. Map to a Q18 archetype in `VERTICAL_Q18` in `lib/audit/questions.ts`
3. Create `lib/audit/question-overlays/{vertical}.ts` with 16-question overrides
4. Add the export to `QUESTION_OVERLAYS` map in `lib/audit/question-overlays/index.ts`
5. Add an 8-force playbook overlay block to `lib/audit/playbook-overlays.ts`
6. Update `audit-scoring-rubric-v2.md` § 4 with the new vertical→Q18 mapping

### Modifying a question's wording for a specific vertical

Edit `lib/audit/question-overlays/{vertical}.ts`. **Never edit option `value` strings** — they're the scoring vocabulary. Only override `question_text`, `helper`, `format_hint`, `unit`, or individual `option_labels`. Helper text ≤ 30 words.

### Adding a new universal question (Q19, Q20...)

1. Add to `AUDIT_QUESTIONS` in `lib/audit/questions.ts`
2. Add to the appropriate screen in `SCREEN_GROUPS`
3. If it changes a force's question count, no other code change needed — `scoreForce` re-averages automatically
4. Add per-vertical helper text in each `question-overlays/{vertical}.ts`
5. Add strength/risk/untracked text in `lib/audit/scoring.ts`
6. Update the rubric doc

### Adding a new Q18 archetype (rare)

1. Add to `AUDIT_QUESTIONS` in `lib/audit/questions.ts`
2. Add to `Q18_CANDIDATE_IDS` in `app/api/audit/submit/route.ts`
3. Map at least one vertical to it in `VERTICAL_Q18`
4. Update the rubric doc § 4

---

## Migrations

`audit_submissions` migration is already applied to prod Supabase. If you change the schema:

```bash
# Local: regenerate types
npx supabase gen types typescript --project-id uopolpjzmgewyfgvdyfk > lib/database.types.ts

# Push to remote (DESTRUCTIVE on shared systems — ask Swastik first)
npx supabase db push
```

Migrations are NOT applied automatically by Vercel.

---

## Deployment

### Identity rule (critical — Vercel rejects otherwise)

Vercel's GitHub integration on `offbeatculture/Business-Communnity` only deploys commits authored by `offbeatculture <tools.offbeatculture@gmail.com>`. Before pushing:

```bash
# repo-scoped only — never --global
git config user.name "offbeatculture"
git config user.email "tools.offbeatculture@gmail.com"

# gh CLI must be on the offbeatculture account
gh auth switch -u offbeatculture
```

### Build matrix (mandatory before push)

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Skipping is not acceptable — Vercel rejects on author errors anyway, and broken builds get noticed late. Note: 2 pre-existing lint errors (`auth/confirm/route.ts` `any` + `theme-toggle.tsx` setState-in-effect) exist on the branch from before the audit work. Vercel's prod build still passes (Next.js doesn't lint-fail builds), but worth a cleanup PR.

### Where the data goes

Vercel preview deploys use the **same env vars as production**. Preview submissions land in the prod `audit_submissions` table. Filter by email to clean up test rows.

---

## Testing checklist (manual)

When changing anything in the audit:

1. Submit one audit as each of these verticals — they read most distinctly:
   - `coaching_courses` (high marketing spend → verify Q9 × Q17 burn signal fires)
   - `restaurant_fnb` (Q18 aggregator share + Zomato/Swiggy native vocab)
   - `manufacturing` (Q18 DSO days + MOQ/RFQ vocabulary)
   - `saas_b2b` (Q18 monthly churn + MRR/ACV vocabulary)
2. For each: verify the verdict page renders, the per-vertical playbook overlay appears, scores look reasonable, signals make sense.
3. Verify the `audit_submissions` row in Supabase has correct `answers` JSONB structure.
4. Verify middleware allows unauthenticated access to `/audit` and `/api/audit/*`.

---

## Where the spec lives

The canonical engine spec is `workshops/Business Bootcamp - 1/v2-7-forces/membership/audit-scoring-rubric-v2.md` (outside this repo). It covers scoring rules, the Q9×Q17 combination math, per-vertical mappings, focus-force picker logic, and the deployment story in detail. If code and rubric drift, update both — the rubric is the source of truth, the code is the implementation.
