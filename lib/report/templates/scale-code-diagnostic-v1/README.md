# Scale Code Diagnostic — Report Template v1

**Status:** LOCKED — approved by Swastik on 25 May 2026 as the canonical structure for the production report.

This directory contains the locked v1 template for the long-form founder assessment report ("The Scale Code Diagnostic"). All future report rendering must produce a document that matches this structure, page-for-page.

## Files in this directory

| File | What it is | Mutability |
|---|---|---|
| `template.html` | The HTML+CSS source of the locked template. Currently hardcoded with one founder's data (`Ofbc Coach`) as a reference. To be turned into a true template with `{{placeholders}}` in the next build phase. | EDIT — but only with Swastik's sign-off on structural changes. |
| `reference-render.pdf` | The 23-page rendered PDF, produced by Chrome headless from `template.html`. Use this as the visual reference when reviewing future renders. | DO NOT EDIT — regenerate from `template.html` if anything changes. |
| `source.md` | The markdown that the HTML was derived from. Useful for content review and as a source for the Claude-prompt that will fill the template in production. | EDIT — but only alongside the HTML so the two stay in sync. |
| `README.md` | This file. | EDIT freely. |

## How to render the PDF (locally, today)

```bash
# From the repo root
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless \
  --disable-gpu \
  --no-pdf-header-footer \
  --virtual-time-budget=20000 \
  --run-all-compositor-stages-before-draw \
  --print-to-pdf="/tmp/diagnostic-render.pdf" \
  "file://$(pwd)/lib/report/templates/scale-code-diagnostic-v1/template.html"
```

Chrome headless fetches the Google Fonts (Inter + Source Serif 4) at render time, so the machine needs network access during render. For production, fonts should be embedded locally (TODO: add `public/fonts/` references).

## Why HTML/CSS + Chrome, not pdfkit

The previous Phase 4 attempt used pdfkit (a Node PDF library) and produced a 96-page document with a broken page master, overlapping cells, and raw field IDs leaking as content. The root causes were:

1. **pdfkit's procedural drawing model** made it hard to express the design — every box, every text position was manual math.
2. **No visual feedback loop** — the only way to see what you'd built was to render the whole PDF.
3. **Page master rendering as 4 separate pages per logical page** — a layout bug that was invisible until rendered.

HTML/CSS gives us:
- Browser-grade typography (real fonts, real kerning, real line-breaking)
- Predictable page-break behaviour (`page-break-before/inside/after`)
- Direct visual debug in any browser (open the HTML file, see what you'll get)
- One layout engine (Chromium) doing the work, well-tested
- Easy iteration — edit CSS, refresh, ship

The cost: requires Chrome at render time. For Vercel deploys this means either a serverless function with `@sparticuz/chromium` or doing the render off-platform (the Mac daemon).

## The data shape this template needs

When the rendering pipeline is built, each render call needs the following structured payload. Field names are illustrative — the actual Zod schema lives in `lib/report/long-form-types.ts` (to be revised to match this template).

### Identity block (cover + headers everywhere)
- `full_name` — "Swastik Coach"
- `business_name` — "Ofbc Coach"
- `vertical_label` — "Coaching / Courses / Info-products"
- `city` — "Bangalore"
- `audit_date` — "25 May 2026"

### §1 — Founder Archetype
- `archetype.name` — "THE AD-FUNDED FOUNDER" (display)
- `archetype.tagline` — one-sentence italic sub-headline
- `archetype.intro_prose` — 2-3 paragraphs explaining the pattern (Claude-written, grounded in answers)
- `archetype.signal_bullets[]` — 5-6 items, each `{q_id, label, founder_answer}`
- `archetype.leverage_paragraph` — Claude prose about what the founder admits + avoids
- `archetype.favorite_move_quote` — the move this archetype always reaches for (italic pull quote)
- `archetype.placement_evidence_rows[]` — 4 rows `{q_id, founder_answer, why_it_matters}` for the "Why we placed you here" table
- `archetype.map_position` — which of 4 cells is YOU (`personal_brand | institution | grinder | agency_model`)
- `archetype.you_callout` — short italic note explaining position nuance
- `archetype.secondary_patterns[]` — 2 items, each with `{name, why_partial_fit}`

### §2 — The Lie
- `lie.name` — "THE X-FACTOR HUNT" (display)
- `lie.tagline` — italic sub-headline
- `lie.evidence_rows[]` — 7 rows `{q_id, sub_label, founder_answer}` for "Why we think you hold this"
- `lie.costing_paragraphs[]` — 3-4 short paragraphs of Claude prose
- `lie.contradiction_rows[]` — 3 rows `{would_say (italic), numbers_say (bold + q_refs)}`

### §3 — 8-Force Scorecard
- `scores.{identity, x_factor, marketing, sales, financial, optimisation, scale, owner_energy}` — each `{score: number, label: "Weak" | "Critical" | "Soft" | "Solid", weakest: bool, strongest: bool}`
- `force_blocks[8]` — for each force, `{prose: string, driven_by_q_ids: string[], sector_view: string}`

### §4 — Your Immediate Move
- `sprint.name` — "THE CUSTOMER-VOICE SPRINT" (display, can be black or branded)
- `sprint.headline_promise` — the pull-quote sentence
- `sprint.target` — single sentence under "Target:"
- `sprint.why_this_move` — Claude prose paragraph
- `sprint.four_week_plan[]` — 4 rows `{week_label, what_you_do, what_you_stop}`
- `sprint.stop_doing[]` — 5 items, each `{action, q_refs}`
- `sprint.first_action_paragraph` — Claude prose
- `sprint.urgency_callout` — red callout box content

### §5 — Vertical Benchmarks
- `benchmarks.comparison_group_note` — italic source note
- `benchmarks.rows[]` — 7 rows `{metric, you, median, top_quartile}`
- `benchmarks.standout_prose` — 2 paragraphs Claude analysis
- `benchmarks.restructure_callout` — amber callout (one paragraph)

### §6 — The Cash Mirror
- `cash.waterfall_steps[]` — ordered list, each `{amount_label (e.g. "₹100"), step_name, deduction_label (or null for first/last), color_class}`
- `cash.headline_callout` — one-line red callout
- `cash.min_cushion_paragraph` — pull-quote
- `cash.four_line_verdict[]` — 4 items, each one numbered paragraph with bold lead

### §7 — The Hidden Force
- `hidden.percentage` — number for the giant display (e.g. 50)
- `hidden.dependency_name` — phrase in red after "dependent on" (e.g. "ongoing ad spend")
- `hidden.body_prose` — 2-3 paragraphs Claude analysis
- `hidden.two_questions[]` — 2 items, each `{question, why_you_dont_know}`

### §8 — The Three Decisions
- `decisions[3]` — each `{title, recommendation, body_paragraphs[]}`

### §9 — 90-Day Reread Bookmark
- `reread.date_display` — "23 August 2026"
- `reread.rows[]` — 5 rows `{metric, today, target}`

### Appendix A — Full Answer Record
- `appendix_a.rows[]` — ~27 rows `{q_id, question_short, answer, score_or_note}`

### Appendix B — Glossary
- Static content. Update only when bootcamp terminology changes.

## Brand / design system

Locked in `template.html`'s `<style>` block. Key tokens:

```
--red:      #E53935   /* primary accent, section markers, scores, "YOU" cell */
--red-dark: #B71C1C   /* Lie headline (the harshest section) */
--black:    #111111   /* body text, display secondary */
--grey:     #666666   /* secondary text, captions */
--rule:     #DDDDDD   /* horizontal rules */
--bg-light: #F8F8F8   /* generic callouts, decision boxes */
--bg-red:   #FFF5F5   /* "YOU" cell, urgency callouts */
--bg-amber: #FFF8EE   /* economic/benchmark callouts */
```

Fonts:
- **Inter** (400/500/600/700/900) — body, all UI, display headings for archetype/lie/sprint
- **Source Serif 4** (400/600 + italic 400) — section titles, the giant numbers (50%, dates), pull-quote-as-callout

Typography scale (loose):
- Display archetype/lie/sprint names: **34pt Inter 900**
- Section title (in serif): **26pt Source Serif 4 600**
- Section eyebrow ("§1 — Your Founder Archetype"): **9pt Inter 700, red, letter-spaced**
- Body: **10.5pt Inter 400, 1.55 line-height**
- Tables: **9.5pt body, 9pt uppercase headers in dark band**
- Q-id chip: **8pt Inter 700, white on red, 2px radius**

Page geometry:
- A4 portrait, 18mm top, 16mm sides, 22mm bottom
- Footer: brand mark left ("THE SCALE CODE DIAGNOSTIC" in red), page count right ("Page N of N" in grey)

## Status & open items

**Locked:** the structure (9 sections + 2 appendices), the visual design, the page-break behaviour, the brand tokens, the data-shape contract above.

**Open (next build phases):**
1. **Convert `template.html` from hardcoded → templated.** Replace every founder-specific value with `{{handlebars}}` or equivalent placeholders. Pick a template engine. Wire to a render function.
2. **Build the Claude-prompt that fills the payload.** The Mac daemon (Claude Max) reads the submission + resolved answers + this README's data-shape spec, and outputs a JSON payload matching the schema. Prompt design needs to honour the 10 anti-padding rules from `long-form-assessment-report-spec-v1.md`.
3. **Replace the pdfkit pipeline** in `lib/report/render-pdf.ts` with a Chrome-headless pipeline. For local dev: shell out to Chrome. For Vercel: package `@sparticuz/chromium` + `puppeteer-core`, OR continue to do rendering on the Mac daemon and only upload the resulting PDF.
4. **Embed Inter + Source Serif 4 locally** in `public/fonts/` so renders don't need network. Update the `<link>` in `template.html` to `@font-face` with local URLs.
5. **Wire approve flow** to use new renderer (currently in `app/api/admin/report-drafts/[id]/approve/route.ts`).

## Reference example: Ofbc Coach

The current `template.html` is hardcoded with one real founder's data — Swastik Coach / Ofbc Coach, a Bangalore coaching business at ₹25 Cr/year. The diagnosis Claude produced:

- **Archetype:** The Ad-Funded Founder (a renamed variant of "The Migrator")
- **Lie:** The X-Factor Hunt
- **Strongest force:** Scale (2.3 / 5)
- **Weakest force:** X-Factor (0.9 / 5)
- **Immediate move:** The Customer-Voice Sprint (30 customer interviews → 5 verbatim sentences → 1 chosen position)
- **Hidden force:** 50% dependency on ongoing ad spend
- **Reread date:** 23 August 2026

This reference render exists at `reference-render.pdf` and demonstrates every visual element of the template populated with real data. Use it as the source-of-truth for "does this match the locked design?"
