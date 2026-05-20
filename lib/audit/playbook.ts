// 7 Forces Business Audit — named-move playbook per force
// ════════════════════════════════════════════════════════════
// Spec: v2-7-forces/membership/audit-scoring-rubric-v1.md §5
// Each entry is derived from the book research in v2-7-forces/research/
// but contains no attribution by design.

import type { ForceKey } from "./types"

export type PlaybookMove = {
  title: string
  body: string // markdown-friendly, single paragraph
}

export type PlaybookVariant = {
  label: string // e.g. "if 'I don't track this' on conversion"
  body: string
}

export type Playbook = {
  force: ForceKey
  force_label: string
  title: string
  duration: string
  promise: string
  diagnosis: string
  moves: PlaybookMove[]
  variants: PlaybookVariant[]
}

export const PLAYBOOKS: Record<ForceKey, Playbook> = {
  identity: {
    force: "identity",
    force_label: "Identity",
    title: "The One-Customer Cut",
    duration: "60 days",
    promise:
      "You'll have a one-sentence answer to \"who is this business for?\" that names a specific person, a specific problem, and a specific trigger — a written list of the customers, products, and work you've fired to earn that focus, and a single outcome (not deliverable) your customer would pay you for if your product disappeared tomorrow.",
    diagnosis:
      "Identity is not your logo, your tagline, or what you tell people at weddings. It's the truthful answer to three questions stacked on top of each other: who runs this business, what outcome does the customer actually buy, and what could you become the undisputed best at in your city. Most owners get all three wrong — and the wrongness compounds. You name yourself by what you make instead of what the customer buys. You serve \"anyone with money\" because firing customers feels expensive. You stay good at what you're already good at instead of choosing what you could be best at. *The thing you are best at doing in your business right now is probably the thing you most need to stop doing.*",
    moves: [
      {
        title: "Name the one customer (Days 1–7)",
        body: "Write one sentence: *\"We serve [specific person] who is dealing with [specific problem] triggered by [specific event].\"* Not \"SMBs.\" Not \"founders.\" A person you can picture, a problem they Google at 11pm, an event that made the problem urgent this week. If your sentence works for three different customers, it's not a sentence — it's a hedge. Rewrite until it only fits one.",
      },
      {
        title: "The disappearance test (Days 7–14)",
        body: "If your product vanished from the market tomorrow, what would your customer do *instead* to get what they were paying you for? That answer — not what's on your invoice — is your real business. Rewrite your one-line description in outcome language: not \"we sell X,\" but \"we deliver [outcome] so that [downstream result].\" If you can't, you're selling a commodity and you don't know it yet.",
      },
      {
        title: "The stop-doing list (Days 14–30)",
        body: "Write three columns on one page: *customers I will fire, products I will kill, work I will refuse.* Minimum three names per column. If the page is blank, you haven't chosen — you've wished. The customers who pay you but drain you. The product line you keep \"just in case.\" The work you accept because saying no feels rude. Pick a date in the next 30 days for each. Tell one person. *What you cannot stop doing is the proof of what you cannot become.*",
      },
      {
        title: "The best-at question (Days 30–45)",
        body: "Answer in one sentence: what is the one thing this business could become the undisputed best at — in your city, your category, your customer's mind? Not what you're good at. What you could be *the best* at, if you stopped everything else. If the answer is \"many things,\" you've answered nothing.",
      },
      {
        title: "The alignment check (Days 45–60)",
        body: "Put the three answers side by side on one page: the one customer, the real outcome, the best-at. Read them out loud. Do they reinforce each other, or do they contradict? If your \"best-at\" doesn't serve your \"one customer,\" one of them is wrong. Rewrite until the three sentences sound like one business — not three.",
      },
    ],
    variants: [],
  },

  x_factor: {
    force: "x_factor",
    force_label: "X-Factor",
    title: "The Refusal Sprint",
    duration: "90 days",
    promise:
      "You'll have one sentence — in your customers' own words — explaining why they refuse the cheaper alternative, one named barrier that stops a well-funded copycat, and zero customers above 25% of revenue.",
    diagnosis:
      "Most owners confuse a *benefit* with a *moat*. \"Better quality.\" \"Faster delivery.\" \"We care more.\" None of these survive a competent rival with capital and 18 months. A real X-Factor has two halves welded together: a specific reason a customer pays you more, and a specific obstacle that stops a copycat from arbitraging that reason away. If you can't name both halves in plain language — using *your customer's words, not yours* — you don't have a moat. You have a head start, and head starts expire. *You can outwork your competitors all the way to the same margin.*",
    moves: [
      {
        title: "The Refusal Interview (Days 1–15)",
        body: "Call 5 of your best-paying customers. Ask one question: \"When you last considered a cheaper option, why did you stay?\" Record their exact words. Stop pitching. Stop explaining. If three customers say the same sentence back, that sentence is your X-Factor. If five give you five different answers, you don't have one yet — you have a service that pleases people for five different accidental reasons.",
      },
      {
        title: "Kill the fake moats (Days 15–25)",
        body: "Write down the top 5 things you tell people make you different. Now cross out every line that a well-funded competitor could copy in 18 months with the same consultants and capital. \"Our team.\" \"Our culture.\" \"Our quality.\" All cross-outs. What survives — usually one or zero items — is what you actually have to work with.",
      },
      {
        title: "Name the barrier (Days 25–40)",
        body: "Pick one of four: (a) you've built a cost or speed gap a challenger can't match without losing money, (b) copying you would damage your largest competitor's existing business so badly they rationally won't, (c) you own a license, person, relationship, or asset nobody can buy, (d) you've spent years building something — reputation, process, embedded systems inside clients — that takes years to replicate. Write the letter. Write the specific reason. If none of the four fits, the rest of this sprint is moot — go back to Move 1.",
      },
      {
        title: "Engineer the lock-in (Days 40–70)",
        body: "Pick the one customer relationship in your book of business and ask: *what happens to this client on Day 1 if they fire us?* If the answer is \"they're fine\" — they have no embedded systems, no migration cost, no relational depth — you have no stickiness. Build one of three: a shared workflow they'd have to rebuild, a piece of IP they'd have to relicense, or a relationship-density (weekly cadence, named pod, on-call line) a new vendor would take 6 months to replicate.",
      },
      {
        title: "The invention question (Day 70)",
        body: "One sentence: *what did you invent that didn't exist before you built it?* A product, a process, a model, a way of working. If the honest answer is \"nothing — we just do the standard thing better,\" the X-Factor doesn't exist yet. Your next 12 months are about inventing one, not marketing harder.",
      },
      {
        title: "The discipline",
        body: "Stop saying \"quality\" and \"service\" out loud. Stop adding features to please everyone. Subtract customers, products, and markets that dilute the refusal sentence. The owners with the strongest moats fire more customers than they win.",
      },
    ],
    variants: [
      {
        label: "if top 3 customers are 60%+ of revenue",
        body: "Run Moves 1–3 in parallel with a Concentration Cut. Days 1–30: identify the *replicable pattern* in your top 3 — same industry, same stage, same problem. Days 30–90: 100 outbound conversations to lookalikes using the refusal sentence from Move 1 as the only pitch. Target: no single customer above 25% of revenue inside 12 months. *A moat that depends on three phone numbers isn't a moat — it's a hostage situation.* The named move only works if you survive long enough to build it.",
      },
    ],
  },

  marketing: {
    force: "marketing",
    force_label: "Marketing",
    title: "The Marketing Stack Sprint",
    duration: "60 days",
    promise:
      "You'll know the one word you own in your customer's mind, have a one-sentence offer your customer can repeat back, and have one distribution method producing engaged leads at a known cost.",
    diagnosis:
      "Marketing is three layers stacked, not one channel. **Position** (the word you own in the customer's mind). **Message** (the sentence the customer can repeat to a friend). **Distribution** (the volume that puts the sentence in front of strangers). Most owners spend Layer 3 money to fix what's actually broken at Layer 1 — and wonder why the ads don't work. The sprint forces you to fix from the bottom up. *Volume on a bad position compounds the loss. A multiplier on zero is still zero.*",
    moves: [
      {
        title: "Position (Days 1–10)",
        body: "Answer in one word: what does your best customer say you are when they describe you to a friend? Not what you *want* to be — what they would actually say. Then list the top 5–7 brands on your category's ladder, in the order your customer would list them, and mark your rung. Then name three things you'll sacrifice to own that rung — customers you'll fire, products you'll kill, markets you'll exit. If \"nothing,\" you don't have a position. You have a wish.",
      },
      {
        title: "Message (Days 10–20)",
        body: "Write your one-sentence offer in this exact shape: *\"You know how [problem]? Well, we [solution] — so that [result].\"* Test it the only way it counts: say it to 3 real customers from memory and ask them to repeat it back to you. If they can't, it failed — rewrite. Then audit your homepage: count \"we / our / us\" sentences vs. \"you / your.\" If \"we\" outnumbers \"you,\" you're competing with your customer for the spotlight. Rewrite.",
      },
      {
        title: "Pick the villain (Day 20)",
        body: "Not a competitor — the *source of pain*, personified. The \"what your customer is up against.\" Name it in writing. If you can't, your marketing has no emotional charge and your story has no enemy.",
      },
      {
        title: "Distribution (Days 20–60)",
        body: "Pick **one** method only: warm outreach, cold outreach, posted content, or paid ads. Define your primary action — one countable unit (1 DM sent, 1 post published, 1 ad refresh). Commit to 100 primary actions per day for the remaining 40 days. Track **engaged leads** (people who raised a hand) — not impressions, not followers. Your cost per engaged lead is the North Star number.",
      },
      {
        title: "The discipline",
        body: "One layer at a time, bottom-up. Don't run ads on a position you haven't decided. Don't write copy for a story your customer can't repeat. Don't add a second channel until the first is at 100/day. The owners who break this rule are the ones who burn lakhs and wonder where the money went.",
      },
    ],
    variants: [
      {
        label: "if \"I don't track this\" on CPL or conversion",
        body: "Add a Day 0 step before Week 1. Build the minimum measurement spreadsheet: lead source, date, contact, did-they-buy. No tracking = no sprint — running 100/day with no signal back is gambling, not marketing.",
      },
    ],
  },

  sales: {
    force: "sales",
    force_label: "Sales",
    title: "The Sales Stack Rebuild",
    duration: "60 days",
    promise:
      "You'll have an offer your prospect can't compare on price, a 5-question investigation that makes the buyer state their own urgency, and a written disqualification line you say out loud — so the close stops being a fight and becomes a formality.",
    diagnosis:
      "Most \"sales problems\" in this room are not sales problems. They are three layers stacked, and the founder is hammering the wrong one. **Layer 1 — the offer** (is it worth its price?). **Layer 2 — the investigation** (does the buyer state their own pain, or do you state it for them?). **Layer 3 — the discipline to walk away** (do you take any prospect, or only the ones who've already sold themselves?). When the offer is weak and the investigation is lazy, founders close harder — and pressure on a large decision *reduces* the close rate. *Closing harder is what amateurs do when the offer is too weak and the questions were too lazy.*",
    moves: [
      {
        title: "Rebuild the offer (Days 1–15)",
        body: "Score your current offer on four dials, 0–1 each: dream outcome, believability, speed to first win, effort the buyer has to put in. Multiply the top two, divide by the bottom two. Under 1.0, you do not have a sales problem — you have a price war you're losing. Then fix the lowest dial first. Then add a guarantee that mildly terrifies you. If the guarantee feels safe, it's not strong enough.",
      },
      {
        title: "Kill the pitch deck (Day 15)",
        body: "Delete every slide that lists features. The buyer doesn't buy features — they buy the size of the problem you helped them see. Replace the deck with a one-page diagnostic sheet: 5 questions, blank space for their answers. *The buyer must sell themselves. Your job is to ask the questions that let them.*",
      },
      {
        title: "Build the 5-question drill (Days 15–30)",
        body: "Write the one objection you hear most (almost always \"you're too expensive\"). Now write 5 questions that make the cost of *not* solving the problem feel bigger than your price — questions about what the problem is costing them in lost customers, wasted hours, team morale, missed opportunities, sleep. Memorise them. Use them in every conversation for 30 days.",
      },
      {
        title: "Write the disqualification line (Day 30)",
        body: "One sentence: *\"This isn't for you if ___.\"* Say it out loud in the first 10 minutes of every sales call. The founders who refuse this step are the ones still chasing prospects six weeks later. Disqualification raises the value of what remains and ends the chase.",
      },
      {
        title: "Kill \"I'll get back to you\" (Days 30–60)",
        body: "Every conversation ends in one of three outcomes: a yes, a specific next action with a date, or a clean no. \"Send me some material,\" \"we'll think about it,\" \"great meeting\" — these are not wins. Count them as losses for 30 days. Watch your real conversion rate emerge.",
      },
      {
        title: "The discipline",
        body: "Fix from the top down — offer first, then questions, then walk-away rule. Don't redesign your script if your offer scores 0.6. Don't practise disqualification if you have no investigation to back it up. One layer at a time, in order.",
      },
    ],
    variants: [
      {
        label: "if \"I don't track this\" on conversion",
        body: "Add a Day 0 step before Move 1. Build the minimum sales log: enquiry date, source, first-meeting date, outcome (yes / specific next step / no), money-in date. Five columns. No log = no rebuild — you cannot fix a conversion rate you cannot see, and \"my close rate is good\" without numbers is the most expensive sentence in this business.",
      },
    ],
  },

  financial: {
    force: "financial",
    force_label: "Financial",
    title: "The Cash & Margin Reset",
    duration: "90 days",
    promise:
      "You'll know your true gross margin per rupee of revenue, your real owner-inclusive profit margin, the number of months of operating expenses sitting in cash, and the one customer or SKU you need to fire.",
    diagnosis:
      "Most owners run on two lies: \"revenue is up so we're winning,\" and \"there's money in the current account so we're fine.\" Both are vanity readings. Cash in one account hides three different numbers — the money you owe the government, the salary you should be paying yourself, and the profit that actually belongs to the business. Until those are physically separated, your P&L is fiction and your gut is your CFO. *Revenue is vanity. Profit is what actually exists. Cash is what keeps you alive.*",
    moves: [
      {
        title: "Pay yourself a real salary (Days 1–7)",
        body: "Write down the monthly salary you'd pay an outside hire to do your job. That's your wage. Re-do last year's P&L with that number as a line item. The \"profit\" you thought you had — recompute it. Most owners discover they are not profitable; they are underpaid. This number is the only honest baseline.",
      },
      {
        title: "Split the one account into five (Days 7–14)",
        body: "Open four new accounts at your existing bank: Profit, Owner Salary, Tax, Operating. Your current account becomes Operating only. Every rupee that comes in lands in a new Income account first — nothing gets paid from it directly.",
      },
      {
        title: "The 10th and 25th ritual (Day 14 onwards)",
        body: "Twice a month, on fixed dates, move money out of Income into the four accounts by percentage. Start with 1% to Profit, a real number to Salary, 25–30% to Tax (factor GST plus advance tax), the rest to Operating. If Operating runs dry before the next allocation, the business is telling you it can't afford how you're running it. Listen — don't top it up from Profit.",
      },
      {
        title: "Fire the bottom (Days 30–60)",
        body: "List every customer and product by gross margin. The bottom quartile is almost always net-negative once you count the working capital, the chasing, the rework. Kill them. The freed capacity is your margin recovery — you don't need new sales, you need fewer bad ones.",
      },
      {
        title: "The one KPI (weekly, ongoing)",
        body: "Gross profit divided by total salary spend, including your own. Target ₹1.80 of gross profit per ₹1.00 of salary. Below ₹1.50, freeze every hire and every raise until pricing or productivity moves the number. *You cannot grow your way out of a margin problem — bigger revenue just makes a bigger leak.*",
      },
    ],
    variants: [
      {
        label: "if cash runway is under 3 months or untracked — The 90-Day Cash Plan",
        body: "Runway is the only number that matters until it crosses 3 months. Day 0: count exactly how many months of operating expenses are in the bank, with zero drawn on any overdraft or working-capital line. Every Monday, print one number on a Post-it on your desk: months of runway. Allocations continue, but Profit holds at 1% — every other rupee above Owner Salary goes to rebuilding cash. No new hires, no new equipment, no new vendor contracts until runway crosses 3 months. Treat the working-capital line as an emergency tool, not as cash flow.",
      },
      {
        label: "if \"I don't track this\" on margin",
        body: "Before Move 1, spend Days 1–3 on measurement. Open a sheet with four columns: revenue, direct materials, direct labour, gross profit. Fill it for the last 12 months from your bank and GST filings. No tracking, no reset — running this sprint without margin numbers is steering a truck with the windscreen painted black.",
      },
    ],
  },

  optimisation: {
    force: "optimisation",
    force_label: "Optimisation",
    title: "The Bottleneck Sprint",
    duration: "90 days",
    promise:
      "You'll have named the one chokepoint pacing your business, removed 10–15 hours/week of the lowest-leverage work from your calendar, killed at least three tasks that should never have existed, and built one written handover so a real person owns what you used to do.",
    diagnosis:
      "Your business doesn't move at the speed of your effort. It moves at the speed of its slowest link. In most Indian SMBs that link is the owner — sitting in the middle of sales, ops, hiring, accounts, vendor calls, and customer escalations, with everything piling up behind them. Working longer hours doesn't fix this. It hides it. Every extra hour you put in lets a broken process survive one more day. *An hour saved anywhere else is a mirage; the hour that matters is the one you free at the chokepoint.* The sprint forces you to find that chokepoint and stop feeding it.",
    moves: [
      {
        title: "Find the pile (Days 1–7)",
        body: "Where does work stack up in your business? Unsigned proposals, unbilled invoices, undelivered orders, unread WhatsApp threads, decisions waiting on you. Walk the flow from enquiry to cash. The pile is sitting in front of your bottleneck — and 90% of the time, you are it.",
      },
      {
        title: "Time-log a week (Days 7–14)",
        body: "For seven days, write down every 30-minute block. At the end, sort every task into three columns: *only I can do this*, *someone else could do this with training*, *this should not exist*. Most owners discover 40–60% of their week is in columns 2 and 3.",
      },
      {
        title: "Kill column 3 first (Days 14–21)",
        body: "Before you delegate anything, *delete*. Approval loops you invented. Reports nobody reads. Meetings you call out of habit. Vendor calls you take because you always have. Cancel them. If the business doesn't notice in two weeks, they're dead forever.",
      },
      {
        title: "Hire or train one person against column 2 (Days 21–60)",
        body: "Pick the single highest-volume task in column 2 — the one eating the most hours. Write the handover in plain language: inputs, outputs, decision rules, what \"done\" looks like. Train one real person on it (existing team or new hire). Do not move to the next task until this one runs without you for two straight weeks.",
      },
      {
        title: "Subordinate the rest (Days 60–90)",
        body: "Stop letting your team push every decision back to you. New rule: anyone bringing you a problem brings three options and their recommendation. Your job shrinks to *yes / no / ask one question*. If they can't recommend, they're not ready — train them, don't rescue them.",
      },
      {
        title: "The discipline",
        body: "One bottleneck at a time. When you free 10 hours, a new chokepoint will appear — sales conversion, fulfillment, cash collection. Don't celebrate. Find the next pile. Repeat the cycle every quarter.",
      },
    ],
    variants: [
      {
        label: "if solo (no team to delegate to)",
        body: "Skip moves 4–5. The work is to *kill and redesign*, not delegate. Add a Day 30 step: take your offer apart. Which deliverable eats 60% of your hours for 20% of the revenue? Cut it, productise it (one fixed scope, one fixed price, one fixed timeline), or raise its price 2–3× so fewer clients pay you more. Solo founders don't escape the bottleneck by working harder — they escape it by selling a smaller, sharper offer that doesn't require them to be everywhere.",
      },
    ],
  },

  scale: {
    force: "scale",
    force_label: "Scale",
    title: "The Break-Point Audit",
    duration: "90 days",
    promise:
      "You'll have named the one thing that breaks at 3x demand, mapped the constraint to either time, team, system, cash, or supply, removed yourself from one critical seat, and have a written sequence for what to fix in what order — so growth stops feeling like a personal punishment.",
    diagnosis:
      "Most founders running ₹2Cr–₹10Cr businesses don't have a growth problem. They have a bottleneck problem dressed up as one. Three weeks of strong leads land, and something cracks — the founder's calendar, the team's quality, the cash gap between delivery and payment, the supply chain, or a system that only works because one person is awake. *If your business stops the day you stop, you don't own a business — you own a well-paid job with a fancy name.* The audit is not about growing faster. It's about designing yourself out of the seat that breaks first.",
    moves: [
      {
        title: "Name the break (Days 1–7)",
        body: "Write the answer to one question on paper: \"If demand 3x'd tomorrow, what cracks first — me, my team, my systems, my cash, or my supply?\" Pick one. Picking two is a refusal to choose. The whole audit pivots on this single named bottleneck.",
      },
      {
        title: "Audit the calendar (Days 7–21)",
        body: "For 14 days, log every hour you personally worked, with a rupee value next to it. Annual founder pay divided by 8,000 is your hourly rate. Highlight every task you did below that rate. That highlighted list is what gets transferred first — not the work you hate, the work that's beneath your number.",
      },
      {
        title: "The first transfer (Days 21–45)",
        body: "Hire one person whose only job is to own the bottleneck you named in Move 1. Not a generalist. Not a \"right hand.\" One seat, one outcome. If the bottleneck is you, that hire is an admin who owns inbox and calendar — not a marketer, not a salesperson. The founder who hires a sales rep before an admin stays stuck.",
      },
      {
        title: "Kill one offering (Days 45–60)",
        body: "List everything you sell. Score each on three things: can a trained stranger deliver it from a written manual, will customers pay a premium for it, and do they come back to buy again. Kill the lowest scorer publicly. Tell the team, tell the customers. *For every project you turn down, the next right one shows up.*",
      },
      {
        title: "The 30-day test (Days 60–90)",
        body: "Take a 7-day stretch where you do not touch operations. No WhatsApp approvals, no last-call sign-offs, no \"just this once.\" Write down what broke. That list is your next sprint's input. If nothing broke, you're not at the bottleneck you thought — you're one rung higher than you scored.",
      },
      {
        title: "The sequence rule",
        body: "Audit before hire. Hire before kill. Kill before test. Skipping order is what makes founders fire three people in eighteen months and call delegation broken. It isn't broken. It was just done out of order.",
      },
    ],
    variants: [
      {
        label: "bottleneck = owner_time",
        body: "Move 3 hires an admin assistant who owns inbox + calendar. Move 5's 7-day test is the real proof. If the test breaks within 48 hours, you're hiring the wrong seat next.",
      },
      {
        label: "bottleneck = team",
        body: "Move 3 hires a layer above (a manager for the team, not another doer). Move 4 becomes a written one-page playbook for the one process that fails most under load. Promote by playbook, not by tenure.",
      },
      {
        label: "bottleneck = systems",
        body: "Skip the hire in Move 3 for Days 21–45 and instead record yourself doing the broken process end-to-end on phone video. Write a one-page checklist from the video. The system isn't a software problem — it's an undocumented head problem.",
      },
      {
        label: "bottleneck = cash or supply",
        body: "Move 3 is not a hire. It's a structural change — collect 50% up front on every new contract (cash), or qualify a second vendor for the input that breaks (supply). One change, locked, before any other move.",
      },
    ],
  },

  owner_energy: {
    force: "owner_energy",
    force_label: "Owner Energy",
    title: "The Decision Diet",
    duration: "30 days",
    promise:
      "You'll have removed 50% of the daily decisions sitting on your head, defended one 90-minute deep-work block five days a week, and reclaimed one full day where the business runs without you.",
    diagnosis:
      "Owner energy isn't a wellness problem. It's a structural one. You're tired because every decision in the business — vendor calls, salary disputes, \"Sir, ek minute,\" WhatsApp pings, customer escalations — funnels into one inbox: yours. The body collapses last. The calendar collapses first. Most owners try to fix this by adding — yoga, holidays, a coach, a course. Wrong direction. The fix is subtraction: fewer decisions on your head, fewer hours in reactive mode, fewer people who can interrupt you. *Your problem isn't time. It's that your intensity has been destroyed by your phone and a team trained to ask you everything.*",
    moves: [
      {
        title: "The Decision Audit (Days 1–3)",
        body: "For 3 days, write down every decision you make. Every one. Then mark each: must-be-me, could-be-someone-else, shouldn't-exist. Most owners find 60–70% are not must-be-me. That's your delegation backlog.",
      },
      {
        title: "The One Priority Rule (Day 4)",
        body: "Write the ONE outcome that, if it moved 30% in 90 days, would change the business. One sentence. If you have three, you have none. Everything else now competes against this.",
      },
      {
        title: "The Stop-Doing List (Days 5–10)",
        body: "Pick three things you will stop this week. One meeting you cancel permanently. One WhatsApp group you exit. One report you stop reading. Tell no one. See if anyone notices. If they don't, it stays dead.",
      },
      {
        title: "The 90-Minute Block (Days 10–30)",
        body: "Same time, same place, every weekday. Phone in another room — not silent, not face-down, *another room*. One task that grows the priority from move #2. No email, no calls, no \"quick check.\" If you can't defend 90 minutes from your own team, you don't run the business — it runs you.",
      },
      {
        title: "The Decision Layer (Days 15–30)",
        body: "Pick two people. Give each a written list of decisions they now make without asking you, and a rupee limit. Tell the whole team: \"For X, ask Ramesh. For Y, ask Priya. Don't ask me.\" First week they'll still ask. Send them back. By week three they stop.",
      },
      {
        title: "The Defended Day (Day 20 onwards)",
        body: "One day a week where you are not in the WhatsApp, not on calls, not in the office. The business runs. If it doesn't, you've found your real constraint — and it isn't you working harder.",
      },
    ],
    variants: [
      {
        label: "if owner walks in feeling \"done\"",
        body: "Skip optimisation. This is triage. Cancel everything non-revenue for 14 days. Find one person — co-founder, spouse, senior employee — and hand them the operational steering wheel for two weeks while you decide whether to rebuild, sell, or shut. *Burned-out owners make terrible strategic decisions; rest first, then decide.*",
      },
    ],
  },
}
