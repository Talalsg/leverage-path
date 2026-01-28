

# Implementation Plan: Sequoia-Inspired Enhancements

## Overview
Enhance your AI Allocator with 6 key features inspired by Sequoia's Digital Nervous System, focusing on relationship intelligence, institutional memory, and signal detection.

---

## Phase 1: Relationship Intelligence (High Priority)

### 1.1 Relationship Warmth Scoring
Add algorithmic relationship scoring based on touchpoint data.

**Database Changes:**
- Add `warmth_score` (decimal) to `contacts` table
- Add `relationship_context` (text) to `contacts` table  
- Add `access_paths` (jsonb) to `contacts` table

**Logic:**
```text
Warmth Score = (Recency Weight x 0.4) + (Frequency Weight x 0.3) + (Context Weight x 0.3)

Where:
- Recency: Days since last touchpoint (decay curve)
- Frequency: Touchpoints per quarter
- Context: Type of interaction (meeting > email > social)
```

**UI Changes:**
- Add warmth indicator (Cold/Warm/Hot) on contact cards
- Color gradient: Red (cold) -> Yellow (neutral) -> Green (warm)
- Show score like "8.5/10 (WARM)"

### 1.2 Access Path Calculator
For any deal founder, find the shortest path through your network.

**New Component:** `AccessPathFinder.tsx`
- Input: Target founder name/company
- Output: Chain of connections to reach them
- Example: "You -> Sarah (Advisor) -> met at TechCrunch -> Target Founder"

**AI Enhancement:**
- Add `find-access-path` action to deal-evaluator
- Analyze contacts and suggest introduction strategies

---

## Phase 2: Institutional Memory (High Priority)

### 2.1 Past Pass Notes System
Never forget why you passed on a deal.

**Database Changes:**
- Add `pass_reason` (text) to `deals` table
- Add `pass_date` (timestamp) to `deals` table
- Add `objections_at_pass` (jsonb) to `deals` table

**UI Changes:**
- When adding a deal, check if company name matches previous passes
- Show alert: "You passed on [Company] on [Date]. Reason: [X]. What has changed?"
- Side-by-side comparison view

**AI Enhancement:**
- Add `check-resurface` action to deal-evaluator
- Automatically compare new pitch vs old objections
- Highlight what has improved/changed

### 2.2 Decision Journal
Track every investment decision with reasoning.

**New Table:** `decision_journal`
- `id`, `user_id`, `deal_id`, `decision` (pass/invest/monitor)
- `reasoning`, `confidence_level`, `market_conditions`
- `follow_up_date`, `follow_up_outcome`

---

## Phase 3: Signal Detection (Medium Priority)

### 3.1 Deal Velocity Tracker
Track how fast deals are progressing through your pipeline.

**New Fields:**
- Add `stage_history` (jsonb) to `deals` table
- Store: `[{stage: 'review', entered_at: timestamp}, ...]`

**UI Component:** `DealVelocityChart.tsx`
- Show average time per stage
- Flag deals moving unusually fast (hot) or slow (stale)
- Compare against your historical averages

### 3.2 Two Critical Questions Dashboard
Sequoia's daily questions on your Dashboard.

**New Component:** `CriticalQuestionsDashboard.tsx`

**Question 1: "Who is building right now?"**
- Show recent deals added (last 7 days)
- Highlight high-velocity deals
- Sector breakdown of current pipeline

**Question 2: "Who do we know?"**
- For each active deal, show relationship paths
- Highlight warm connections vs cold outreach
- Suggest who to ask for introductions

---

## Phase 4: Enhanced Alerts (Medium Priority)

### 4.1 Automated Governance Alerts
Expand `AlertsPanel` with Sequoia-style triggers.

**New Alert Types:**
```text
GREEN PATH (Healthy):
- Deal progressing normally
- Warm relationship path exists
- AI score > 70

YELLOW PATH (Monitor):
- Deal stalled > 7 days
- No touchpoint with key contact > 14 days
- AI score 50-70

RED PATH (Critical):
- Deal stalled > 14 days
- Cold relationship path only
- AI score < 50
- Portfolio company showing warning signs
```

**UI:**
- Color-coded alert cards
- Automatic suggested actions
- One-click "Snooze" or "Take Action"

---

## Phase 5: Portfolio Health Monitor (If Portfolio Data Available)

### 5.1 Portfolio Control Tower
Add health tracking for portfolio companies.

**New Fields in `portfolio` table:**
- `monthly_revenue` (numeric)
- `burn_rate` (numeric)
- `runway_months` (integer)
- `last_update` (timestamp)
- `health_status` (enum: healthy/warning/critical)

**UI Component:** `PortfolioHealthDashboard.tsx`
- Card per company with key metrics
- Health indicator (green/yellow/red)
- Automated alerts when metrics cross thresholds

---

## Implementation Order

| Order | Feature | Effort | Value |
|-------|---------|--------|-------|
| 1 | Relationship Warmth Scoring | Medium | High |
| 2 | Past Pass Notes System | Medium | High |
| 3 | Two Critical Questions Dashboard | Low | High |
| 4 | Enhanced Governance Alerts | Low | Medium |
| 5 | Deal Velocity Tracker | Medium | Medium |
| 6 | Access Path Calculator | High | Medium |
| 7 | Portfolio Health Monitor | Medium | Medium |

---

## Technical Details

### Database Migration Required
```sql
-- Add relationship intelligence fields
ALTER TABLE contacts ADD COLUMN warmth_score decimal DEFAULT 5.0;
ALTER TABLE contacts ADD COLUMN relationship_context text;
ALTER TABLE contacts ADD COLUMN access_paths jsonb;

-- Add institutional memory fields
ALTER TABLE deals ADD COLUMN pass_reason text;
ALTER TABLE deals ADD COLUMN pass_date timestamp with time zone;
ALTER TABLE deals ADD COLUMN objections_at_pass jsonb;
ALTER TABLE deals ADD COLUMN stage_history jsonb DEFAULT '[]'::jsonb;

-- Add portfolio health fields
ALTER TABLE portfolio ADD COLUMN monthly_revenue numeric;
ALTER TABLE portfolio ADD COLUMN burn_rate numeric;
ALTER TABLE portfolio ADD COLUMN runway_months integer;
ALTER TABLE portfolio ADD COLUMN health_status text DEFAULT 'healthy';

-- Create decision journal table
CREATE TABLE decision_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deal_id uuid REFERENCES deals(id),
  decision text NOT NULL,
  reasoning text,
  confidence_level integer,
  market_conditions text,
  follow_up_date date,
  follow_up_outcome text,
  created_at timestamp with time zone DEFAULT now()
);
```

### New Edge Function Actions
- `calculate-warmth` - Compute relationship warmth scores
- `find-access-path` - Find shortest path to target
- `check-resurface` - Compare new deal vs past passes
- `analyze-velocity` - Calculate deal velocity metrics

### New Components
- `RelationshipWarmthBadge.tsx`
- `AccessPathFinder.tsx`
- `PastPassAlert.tsx`
- `CriticalQuestionsDashboard.tsx`
- `DealVelocityChart.tsx`
- `PortfolioHealthDashboard.tsx`
- `DecisionJournalModal.tsx`

---

## Summary

This plan brings 6 Sequoia-inspired capabilities to your system:

1. **Relationship Intelligence** - Know who's warm vs cold
2. **Institutional Memory** - Never forget why you passed
3. **Signal Detection** - Track deal velocity and anomalies
4. **Smart Alerts** - Automated governance with action suggestions
5. **Critical Questions** - Daily focus on what matters
6. **Portfolio Health** - Monitor your investments

These features transform your system from a deal tracker into a true **Digital Nervous System** for angel investing.

