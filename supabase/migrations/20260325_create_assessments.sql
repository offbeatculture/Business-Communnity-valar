-- ══════════════════════════════════════════════
-- Multi-Assessment System
-- ══════════════════════════════════════════════

-- Drop old tables if they exist (no production data)
DROP TABLE IF EXISTS assessment_results CASCADE;
DROP TABLE IF EXISTS assessment_questions CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;

-- Parent: Assessments
CREATE TABLE assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  scoring_type text NOT NULL DEFAULT 'generic' CHECK (scoring_type IN ('scale-code', 'generic')),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Questions belong to an assessment
CREATE TABLE assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  category text NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aq_assessment ON assessment_questions (assessment_id);
CREATE INDEX idx_aq_category ON assessment_questions (category);

-- Results: one per user per assessment
CREATE TABLE assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  assessment_id uuid NOT NULL REFERENCES assessments(id),
  answers jsonb NOT NULL DEFAULT '{}',
  scores jsonb NOT NULL DEFAULT '{}',
  total_score integer NOT NULL DEFAULT 0,
  max_possible_score integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, assessment_id)
);

CREATE INDEX idx_ar_user ON assessment_results (user_id);
CREATE INDEX idx_ar_assessment ON assessment_results (assessment_id);

-- RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read published assessments"
  ON assessments FOR SELECT TO authenticated
  USING (is_published = true);

CREATE POLICY "Authenticated can read active questions of published assessments"
  ON assessment_questions FOR SELECT TO authenticated
  USING (is_active = true AND assessment_id IN (SELECT id FROM assessments WHERE is_published = true));

CREATE POLICY "Users can read own results"
  ON assessment_results FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger for assessments
CREATE OR REPLACE FUNCTION update_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_assessments_updated_at();

-- ══════════════════════════════════════════════
-- Seed: The Scale Code Assessment
-- ══════════════════════════════════════════════

INSERT INTO assessments (id, title, slug, description, scoring_type) VALUES
('00000000-0000-0000-0000-000000000001',
 'The Scale Code',
 'scale-code',
 '17 questions. 5 minutes. A diagnosis of your business across 8 pillars that tells you exactly what to fix first.',
 'scale-code');

-- Q1: Offer Engine (behavioral)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'offer', 'How do you decide what to charge?', 1, '[
  {"label": "I look at what competitors charge and price myself lower to win deals. No real logic behind the number.", "value": "a", "score": 1},
  {"label": "I charge based on time — hourly or daily rate. More hours = more money.", "value": "b", "score": 2},
  {"label": "I have fixed packages, but I still end up customizing the price for most clients after the first call.", "value": "c", "score": 3},
  {"label": "I have 2-3 tiers based on scope and deliverables. Clients pick a tier. Minimal negotiation.", "value": "d", "score": 4},
  {"label": "My pricing is based on the outcome I create, not the time I spend. Clients rarely push back — they pick a tier and pay.", "value": "e", "score": 5}
]');

-- Q2: Lead Machine (diagnostic)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'leads', 'What does your lead flow actually look like month to month?', 2, '[
  {"label": "Completely unpredictable. Some months zero inbound, some months a few. No pattern.", "value": "a", "score": 1},
  {"label": "Feast or famine. One great month, then two dead months. I can''t tell what caused either.", "value": "b", "score": 2},
  {"label": "Leads come in most months, but the volume swings wildly. I can''t forecast next month''s pipeline.", "value": "c", "score": 3},
  {"label": "Fairly consistent. I know roughly how many leads I''ll get. A bad month is 30% below average, not zero.", "value": "d", "score": 4},
  {"label": "Lead flow exceeds capacity. I choose who to work with. I can predict next quarter''s pipeline within 15%.", "value": "e", "score": 5}
]');

-- Q3: Retention Loop (behavioral)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'retention', 'What happens after you finish delivering work to a client?', 3, '[
  {"label": "I send the final deliverable, they pay, we never talk again. No follow-up. Done is done.", "value": "a", "score": 1},
  {"label": "I might send a \"hope you liked it\" message. If they come back, great. I don''t actively do anything.", "value": "b", "score": 2},
  {"label": "I check in occasionally — maybe a festival message. But there''s no system.", "value": "c", "score": 3},
  {"label": "I have a post-delivery sequence: feedback call, testimonial request, referral ask. Every client goes through it.", "value": "d", "score": 4},
  {"label": "Structured retention system. Clients get check-ins at 30, 60, 90 days. Referral program is live. Most new clients come from existing ones.", "value": "e", "score": 5}
]');

-- Q4: Conversion System (behavioral)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'conversion', 'Walk me through your sales conversation — what happens step by step?', 4, '[
  {"label": "There''s no structure. I get on a call, talk about what I do, answer questions, and quote a price.", "value": "a", "score": 1},
  {"label": "I have a rough flow in my head — intro, discussion, pricing — but I skip steps depending on my mood.", "value": "b", "score": 2},
  {"label": "I follow a general sequence: understand their problem, explain my solution, share pricing. Never documented it.", "value": "c", "score": 3},
  {"label": "I have a defined process: qualify, diagnose, present options, handle objections, follow up. I use it consistently.", "value": "d", "score": 4},
  {"label": "The process is documented. My team follows it. We score leads, track conversion by stage, and know where deals get stuck.", "value": "e", "score": 5}
]');

-- Q5: Money Map (diagnostic)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'money', 'What does your cash flow actually look like?', 5, '[
  {"label": "I have no idea. Some months I can''t pay myself. Other months feel great. No pattern.", "value": "a", "score": 1},
  {"label": "I make money but I''m always surprised by expenses — GST payments, annual subscriptions, contractor bills.", "value": "b", "score": 2},
  {"label": "Cash flow is okay, but I have ₹5-10L stuck in receivables that I keep chasing.", "value": "c", "score": 3},
  {"label": "Payment terms are set upfront. Most clients pay on time. I have 2-3 months of expenses saved.", "value": "d", "score": 4},
  {"label": "6-month cash forecast. Collections are automated. Cash reserves cover 6+ months.", "value": "e", "score": 5}
]');

-- Q6: Offer Engine (diagnostic)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'offer', 'What happens when a prospect asks ''why should I pick you over someone cheaper?''', 6, '[
  {"label": "I panic internally. I usually drop my price or throw in extra work to win the deal.", "value": "a", "score": 1},
  {"label": "I talk about my experience and quality, but I can tell they''re not convinced.", "value": "b", "score": 2},
  {"label": "I have a decent answer, but it sounds like what every other person in my space would say.", "value": "c", "score": 3},
  {"label": "I walk them through what they get at each tier and what outcome to expect. Most stop comparing.", "value": "d", "score": 4},
  {"label": "This question rarely comes up. Clients come knowing what I offer and what it costs.", "value": "e", "score": 5}
]');

-- Q7: Ops Blueprint (behavioral)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'ops', 'How does work get done day-to-day in your business?', 7, '[
  {"label": "Everything lives in my head. I decide what to do each morning. Nobody else could replicate what I do.", "value": "a", "score": 1},
  {"label": "Some things are written down — mostly in WhatsApp messages or scattered notes.", "value": "b", "score": 2},
  {"label": "I have checklists or docs for the important stuff, but they''re outdated or incomplete.", "value": "c", "score": 3},
  {"label": "Top processes are documented and assigned to owners. New team members contribute within a week.", "value": "d", "score": 4},
  {"label": "SOPs exist for every core function. Quality stays consistent regardless of who does the work.", "value": "e", "score": 5}
]');

-- Q8: The Moat (diagnostic)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'moat', 'Why do clients actually choose you? Not what you hope — what they tell you.', 8, '[
  {"label": "I don''t know. I''ve never asked. I assume it''s my price.", "value": "a", "score": 1},
  {"label": "\"Someone referred me\" or \"You were available.\" Convenience, not intention.", "value": "b", "score": 2},
  {"label": "\"You seemed knowledgeable.\" Positive but vague. They can''t pinpoint why I''m different.", "value": "c", "score": 3},
  {"label": "Clients name specific things: \"Your process is clear,\" \"You specialize in what I need.\"", "value": "d", "score": 4},
  {"label": "\"There''s nobody else who does what you do.\" Clients refer others using your framework language.", "value": "e", "score": 5}
]');

-- Q9: Lead Machine (behavioral)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'leads', 'What do you do each week to generate new leads?', 9, '[
  {"label": "Nothing specific. I wait for referrals or post on WhatsApp when things get slow.", "value": "a", "score": 1},
  {"label": "I do some outreach or post content, but it''s inconsistent.", "value": "b", "score": 2},
  {"label": "I have one channel running regularly — content, cold outreach, or ads — but I''m doing all of it.", "value": "c", "score": 3},
  {"label": "I have 1-2 channels on a weekly rhythm. Some of it happens without me.", "value": "d", "score": 4},
  {"label": "Multiple channels run simultaneously. My team owns execution. I review numbers, not tasks.", "value": "e", "score": 5}
]');

-- Q10: A-Team (behavioral)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'team', 'How do you hire and onboard new people?', 10, '[
  {"label": "I haven''t hired anyone. I do everything myself.", "value": "a", "score": 1},
  {"label": "I''ve hired whoever was available or cheapest — family, friends. No proper process.", "value": "b", "score": 2},
  {"label": "I hire for specific roles, but onboarding is \"sit with me and watch.\"", "value": "c", "score": 3},
  {"label": "I have a defined role, clear expectations, and a 30-day ramp plan.", "value": "d", "score": 4},
  {"label": "Structured hiring with screening criteria. Onboarding is documented. New hires productive in week one.", "value": "e", "score": 5}
]');

-- Q11: Conversion System (diagnostic)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'conversion', 'What happens after someone shows interest but doesn''t buy immediately?', 11, '[
  {"label": "Nothing. If they don''t say yes on the call, I assume they''re not interested.", "value": "a", "score": 1},
  {"label": "I follow up once or twice over WhatsApp. If they don''t respond, I drop it.", "value": "b", "score": 2},
  {"label": "I try to follow up, but I lose track. Some leads get 3 follow-ups, others I forget.", "value": "c", "score": 3},
  {"label": "Every lead gets a follow-up sequence. I track stages. Nothing slips through.", "value": "d", "score": 4},
  {"label": "Automated sequences handle initial follow-up. My team handles high-value leads. I know my close rate by source.", "value": "e", "score": 5}
]');

-- Q12: The Moat (behavioral)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'moat', 'How do you position yourself against competitors?', 12, '[
  {"label": "I don''t think about competitors. I just do my work and hope clients find me.", "value": "a", "score": 1},
  {"label": "I know my competitors, but my positioning is basically \"I do good work.\"", "value": "b", "score": 2},
  {"label": "I serve a specific type of client — but I can''t explain why someone should pick me over 5 others.", "value": "c", "score": 3},
  {"label": "I have a clear niche, a named methodology, and content that demonstrates my expertise.", "value": "d", "score": 4},
  {"label": "I own a category. Proprietary method, published IP, or brand authority that can''t be copied in 90 days.", "value": "e", "score": 5}
]');

-- Q13: Ops Blueprint (diagnostic)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'ops', 'What happens if you step away from your business for two weeks?', 13, '[
  {"label": "Everything stops. Nothing moves unless I''m personally pushing it.", "value": "a", "score": 1},
  {"label": "Things slow down significantly. Anything important waits for me.", "value": "b", "score": 2},
  {"label": "Delivery keeps going, but quality dips. My team calls me every other day.", "value": "c", "score": 3},
  {"label": "Most things run fine. A couple of edge cases need my input. Output stays at 80-90%.", "value": "d", "score": 4},
  {"label": "The business runs without me for weeks. I come back and review dashboards, not fires.", "value": "e", "score": 5}
]');

-- Q14: Money Map (behavioral)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'money', 'How do you track your business finances?', 14, '[
  {"label": "I don''t. Business and personal money are in the same account. I check my bank balance.", "value": "a", "score": 1},
  {"label": "I have a separate account, but tracking means looking at UPI statements once a month.", "value": "b", "score": 2},
  {"label": "I track revenue and expenses in a spreadsheet. I know revenue but not profit.", "value": "c", "score": 3},
  {"label": "I track revenue, costs, and profit monthly. I know my margins and break-even number.", "value": "d", "score": 4},
  {"label": "Real-time dashboard. Unit economics per service line, 6-month cash flow forecast.", "value": "e", "score": 5}
]');

-- Q15: A-Team (diagnostic)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'team', 'How do decisions get made on your team?', 15, '[
  {"label": "There''s no team. Every decision is mine.", "value": "a", "score": 1},
  {"label": "I have people, but they wait for me. Every decision flows through my WhatsApp.", "value": "b", "score": 2},
  {"label": "My team handles routine decisions. Anything unusual comes to me. I''m the bottleneck.", "value": "c", "score": 3},
  {"label": "My team owns their areas. They make 80% of decisions. I handle strategy and exceptions.", "value": "d", "score": 4},
  {"label": "I manage leaders, not tasks. My direct reports run their functions. I set direction.", "value": "e", "score": 5}
]');

-- Q16: Retention Loop (diagnostic)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'retention', 'What do your repeat business and referral numbers actually look like?', 16, '[
  {"label": "Almost no repeat business. Each client is one-time. Referrals happen by accident.", "value": "a", "score": 1},
  {"label": "Some clients come back, but I couldn''t tell you the percentage.", "value": "b", "score": 2},
  {"label": "Maybe 20-30% of clients come back or refer someone. Decent but inconsistent.", "value": "c", "score": 3},
  {"label": "40-50% of revenue from repeat clients or referrals. I track it and nurture those relationships.", "value": "d", "score": 4},
  {"label": "60%+ of new business from referrals or repeat purchases. Growth compounds without more marketing spend.", "value": "e", "score": 5}
]');

-- Q17: Revenue (stage question)
INSERT INTO assessment_questions (assessment_id, category, question_text, sort_order, options) VALUES
('00000000-0000-0000-0000-000000000001', 'revenue', 'What''s your approximate annual business revenue?', 17, '[
  {"label": "₹0 – ₹1 lakh/year", "value": "stage_0", "score": 0},
  {"label": "₹1 lakh – ₹10 lakh/year", "value": "stage_1", "score": 1},
  {"label": "₹10 lakh – ₹50 lakh/year", "value": "stage_2", "score": 2},
  {"label": "₹50 lakh – ₹1 crore/year", "value": "stage_3", "score": 3},
  {"label": "₹1 crore – ₹3 crore/year", "value": "stage_4", "score": 4},
  {"label": "₹3 crore – ₹5 crore/year", "value": "stage_5", "score": 5},
  {"label": "₹5 crore – ₹10 crore+/year", "value": "stage_6", "score": 6}
]');
